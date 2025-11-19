#!/usr/bin/env python3
"""
DNS Failover Controller
Receives webhooks from Alertmanager and manages DNS failover between Cloudflare Tunnel and VPS.
"""

import os
import logging
import json
import time
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Dict, Any
from flask import Flask, request, jsonify
import requests
from dataclasses import dataclass, asdict
import yaml
from kubernetes import client, config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)


class DNSTarget(Enum):
    """DNS target states"""
    CLOUDFLARE_TUNNEL = "tunnel"
    VPS_FAILOVER = "vps"


class SystemState(Enum):
    """System states for state machine"""
    PRIMARY_HEALTHY = "primary_healthy"
    PRIMARY_DEGRADED = "primary_degraded"
    FAILING_OVER = "failing_over"
    ON_FAILOVER = "on_failover"
    RECOVERING = "recovering"
    DUAL_FAILURE = "dual_failure"


@dataclass
class FailoverState:
    """Current state of the failover system"""
    current_target: DNSTarget
    system_state: SystemState
    last_change_time: str
    failover_count_24h: int = 0
    stabilization_start: Optional[str] = None
    last_alert_time: Optional[str] = None


class CloudflareAPI:
    """Cloudflare API client for DNS management"""

    def __init__(self, api_token: str, zone_id: str):
        self.api_token = api_token
        self.zone_id = zone_id
        self.base_url = "https://api.cloudflare.com/client/v4"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }

    def get_dns_record(self, name: str) -> Optional[Dict[str, Any]]:
        """Get DNS record for a hostname"""
        url = f"{self.base_url}/zones/{self.zone_id}/dns_records"
        params = {"name": name}

        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            result = response.json()

            if result.get("success") and result.get("result"):
                return result["result"][0]
            return None
        except Exception as e:
            logger.error(f"Error getting DNS record: {e}")
            return None

    def update_to_tunnel(self, hostname: str, tunnel_id: str) -> bool:
        """Update DNS to point to Cloudflare Tunnel (CNAME)"""
        record = self.get_dns_record(hostname)
        if not record:
            logger.error(f"DNS record not found for {hostname}")
            return False

        record_id = record["id"]
        tunnel_cname = f"{tunnel_id}.cfargotunnel.com"

        # If already a CNAME to tunnel, no change needed
        if record["type"] == "CNAME" and record["content"] == tunnel_cname:
            logger.info(f"{hostname} already points to tunnel")
            return True

        # Update to CNAME
        url = f"{self.base_url}/zones/{self.zone_id}/dns_records/{record_id}"
        data = {
            "type": "CNAME",
            "name": hostname.split('.')[0],  # subdomain only
            "content": tunnel_cname,
            "proxied": True
        }

        try:
            response = requests.put(url, headers=self.headers, json=data, timeout=10)
            response.raise_for_status()
            result = response.json()

            if result.get("success"):
                logger.info(f"✅ Updated {hostname} → CNAME {tunnel_cname}")
                return True
            else:
                logger.error(f"Cloudflare API error: {result}")
                return False
        except Exception as e:
            logger.error(f"Error updating DNS to tunnel: {e}")
            return False

    def update_to_vps(self, hostname: str, vps_ip: str) -> bool:
        """Update DNS to point to VPS (A record)"""
        record = self.get_dns_record(hostname)
        if not record:
            logger.error(f"DNS record not found for {hostname}")
            return False

        record_id = record["id"]

        # If already an A record to VPS with correct proxying, no change needed
        if record["type"] == "A" and record["content"] == vps_ip and record.get("proxied") == False:
            logger.info(f"{hostname} already points to VPS (proxied=False)")
            return True

        # Update to A record
        url = f"{self.base_url}/zones/{self.zone_id}/dns_records/{record_id}"
        data = {
            "type": "A",
            "name": hostname.split('.')[0],  # subdomain only
            "content": vps_ip,
            "proxied": False  # Must be False to return actual VPS IP for failover
        }

        try:
            response = requests.put(url, headers=self.headers, json=data, timeout=10)
            response.raise_for_status()
            result = response.json()

            if result.get("success"):
                logger.info(f"✅ Updated {hostname} → A {vps_ip}")
                return True
            else:
                logger.error(f"Cloudflare API error: {result}")
                return False
        except Exception as e:
            logger.error(f"Error updating DNS to VPS: {e}")
            return False


class FailoverController:
    """Main controller for DNS failover logic"""

    def __init__(self):
        # Configuration from environment
        self.hostname = os.getenv("HOSTNAME", "mirai.sogos.io")
        self.tunnel_id = os.getenv("TUNNEL_ID", "cb2a7768-4162-4da9-ac04-138fdecf3e3d")
        self.vps_ip = os.getenv("VPS_IP", "165.227.110.199")
        self.stabilization_failover_minutes = float(os.getenv("STABILIZATION_FAILOVER_MINUTES", "5"))
        self.stabilization_failback_minutes = float(os.getenv("STABILIZATION_FAILBACK_MINUTES", "10"))
        self.max_failovers_24h = int(os.getenv("MAX_FAILOVERS_24H", "3"))
        self.dry_run = os.getenv("DRY_RUN", "false").lower() == "true"

        # Cloudflare API
        api_token = os.getenv("CLOUDFLARE_API_TOKEN")
        zone_id = os.getenv("CLOUDFLARE_ZONE_ID")
        if not api_token or not zone_id:
            raise ValueError("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be set")

        self.cf_api = CloudflareAPI(api_token, zone_id)

        # Kubernetes client
        try:
            config.load_incluster_config()
        except:
            config.load_kube_config()
        self.k8s_core = client.CoreV1Api()
        self.namespace = "ingress"
        self.configmap_name = "dns-failover-state"

        # State management
        self.state = self._load_state()

    def _load_state(self) -> FailoverState:
        """Load state from ConfigMap or initialize"""
        try:
            cm = self.k8s_core.read_namespaced_config_map(self.configmap_name, self.namespace)
            state_json = cm.data.get("state.json", "{}")
            state_dict = json.loads(state_json)

            # Convert string values back to enums
            state_dict["current_target"] = DNSTarget(state_dict.get("current_target", "tunnel"))
            state_dict["system_state"] = SystemState(state_dict.get("system_state", "primary_healthy"))

            logger.info(f"Loaded state from ConfigMap: {state_dict}")
            return FailoverState(**state_dict)
        except Exception as e:
            logger.warning(f"Could not load state from ConfigMap: {e}. Initializing to default.")
            return FailoverState(
                current_target=DNSTarget.CLOUDFLARE_TUNNEL,
                system_state=SystemState.PRIMARY_HEALTHY,
                last_change_time=datetime.utcnow().isoformat(),
                failover_count_24h=0
            )

    def _save_state(self):
        """Save state to ConfigMap"""
        try:
            # Convert state to dict with enum values as strings
            state_dict = asdict(self.state)
            state_dict["current_target"] = self.state.current_target.value
            state_dict["system_state"] = self.state.system_state.value

            state_json = json.dumps(state_dict, indent=2)

            # Update ConfigMap
            cm = self.k8s_core.read_namespaced_config_map(self.configmap_name, self.namespace)
            cm.data["state.json"] = state_json
            self.k8s_core.patch_namespaced_config_map(self.configmap_name, self.namespace, cm)

            logger.info(f"Saved state to ConfigMap: {state_dict}")
        except Exception as e:
            logger.error(f"Failed to save state to ConfigMap: {e}")

    def handle_alert(self, alert_data: Dict[str, Any]) -> Dict[str, str]:
        """Handle incoming alert webhook"""
        alerts = alert_data.get("alerts", [])

        for alert in alerts:
            labels = alert.get("labels", {})
            status = alert.get("status", "")
            alert_name = labels.get("alertname", "")

            logger.info(f"Processing alert: {alert_name} ({status})")

            if alert_name == "CloudflareTunnelDown" and status == "firing":
                return self._handle_tunnel_down()

            elif alert_name == "CloudflareTunnelRecovered" and status in ["firing", "resolved"]:
                return self._handle_tunnel_recovered()

            elif alert_name == "DualFailure" and status == "firing":
                return self._handle_dual_failure()

        return {"status": "ok", "action": "none"}

    def _handle_tunnel_down(self) -> Dict[str, str]:
        """Handle Cloudflare Tunnel down alert"""
        logger.warning("🔥 Cloudflare Tunnel is DOWN")

        # Check if already on failover
        if self.state.current_target == DNSTarget.VPS_FAILOVER:
            logger.info("Already on VPS failover")
            return {"status": "ok", "action": "already_on_failover"}

        # Check circuit breaker
        if self.state.failover_count_24h >= self.max_failovers_24h:
            logger.error(f"⛔ Circuit breaker triggered! {self.state.failover_count_24h} failovers in 24h")
            return {"status": "error", "action": "circuit_breaker"}

        # Start stabilization if not already started
        if not self.state.stabilization_start:
            self.state.stabilization_start = datetime.utcnow().isoformat()
            self.state.system_state = SystemState.PRIMARY_DEGRADED
            self._save_state()
            logger.info(f"⏱️ Starting {self.stabilization_failover_minutes}min stabilization period")
            return {"status": "ok", "action": "stabilizing"}

        # Check if stabilization period has passed
        stabilization_start = datetime.fromisoformat(self.state.stabilization_start)
        elapsed = datetime.utcnow() - stabilization_start
        required = timedelta(minutes=self.stabilization_failover_minutes)

        if elapsed < required:
            remaining = (required - elapsed).total_seconds() / 60
            logger.info(f"⏱️ Stabilizing... {remaining:.1f} minutes remaining")
            return {"status": "ok", "action": "stabilizing", "remaining_minutes": remaining}

        # Perform failover
        logger.warning(f"🚨 Initiating failover to VPS after {elapsed.total_seconds()/60:.1f} minutes")

        if self.dry_run:
            logger.info("DRY RUN: Would switch DNS to VPS")
        else:
            success = self.cf_api.update_to_vps(self.hostname, self.vps_ip)
            if not success:
                logger.error("Failed to update DNS to VPS")
                return {"status": "error", "action": "dns_update_failed"}

        # Update state
        self.state.current_target = DNSTarget.VPS_FAILOVER
        self.state.system_state = SystemState.ON_FAILOVER
        self.state.last_change_time = datetime.utcnow().isoformat()
        self.state.failover_count_24h += 1
        self.state.stabilization_start = None
        self._save_state()

        logger.info("✅ Failover to VPS complete")
        return {"status": "ok", "action": "failed_over_to_vps"}

    def _handle_tunnel_recovered(self) -> Dict[str, str]:
        """Handle Cloudflare Tunnel recovered alert"""
        logger.info("✅ Cloudflare Tunnel has RECOVERED")

        # Check if on failover
        if self.state.current_target != DNSTarget.VPS_FAILOVER:
            logger.info("Already on Cloudflare Tunnel")
            return {"status": "ok", "action": "already_on_primary"}

        # Start stabilization if not already started
        if not self.state.stabilization_start:
            self.state.stabilization_start = datetime.utcnow().isoformat()
            self.state.system_state = SystemState.RECOVERING
            self._save_state()
            logger.info(f"⏱️ Starting {self.stabilization_failback_minutes}min stabilization before failback")
            return {"status": "ok", "action": "stabilizing"}

        # Check if stabilization period has passed
        stabilization_start = datetime.fromisoformat(self.state.stabilization_start)
        elapsed = datetime.utcnow() - stabilization_start
        required = timedelta(minutes=self.stabilization_failback_minutes)

        if elapsed < required:
            remaining = (required - elapsed).total_seconds() / 60
            logger.info(f"⏱️ Stabilizing... {remaining:.1f} minutes remaining before failback")
            return {"status": "ok", "action": "stabilizing", "remaining_minutes": remaining}

        # Perform failback
        logger.info(f"🔄 Initiating failback to Cloudflare Tunnel after {elapsed.total_seconds()/60:.1f} minutes")

        if self.dry_run:
            logger.info("DRY RUN: Would switch DNS back to Cloudflare Tunnel")
        else:
            success = self.cf_api.update_to_tunnel(self.hostname, self.tunnel_id)
            if not success:
                logger.error("Failed to update DNS to tunnel")
                return {"status": "error", "action": "dns_update_failed"}

        # Update state
        self.state.current_target = DNSTarget.CLOUDFLARE_TUNNEL
        self.state.system_state = SystemState.PRIMARY_HEALTHY
        self.state.last_change_time = datetime.utcnow().isoformat()
        self.state.stabilization_start = None
        self._save_state()

        logger.info("✅ Failback to Cloudflare Tunnel complete")
        return {"status": "ok", "action": "failed_back_to_tunnel"}

    def _handle_dual_failure(self) -> Dict[str, str]:
        """Handle dual failure alert"""
        logger.error("🚨🚨 DUAL FAILURE: Both Cloudflare Tunnel AND VPS are down!")
        self.state.system_state = SystemState.DUAL_FAILURE
        self._save_state()
        return {"status": "error", "action": "dual_failure"}


# Initialize controller
controller = FailoverController()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "current_target": controller.state.current_target.value,
        "system_state": controller.state.system_state.value
    })


@app.route('/webhook', methods=['POST'])
def webhook():
    """Alertmanager webhook endpoint"""
    try:
        alert_data = request.get_json()
        logger.info(f"Received webhook: {json.dumps(alert_data, indent=2)}")

        result = controller.handle_alert(alert_data)
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/state', methods=['GET'])
def get_state():
    """Get current state"""
    state_dict = asdict(controller.state)
    # Convert enums to strings for JSON serialization
    state_dict['current_target'] = state_dict['current_target'].value if isinstance(state_dict['current_target'], DNSTarget) else state_dict['current_target']
    state_dict['system_state'] = state_dict['system_state'].value if isinstance(state_dict['system_state'], SystemState) else state_dict['system_state']
    return jsonify(state_dict)


if __name__ == '__main__':
    logger.info(f"Starting DNS Failover Controller for {controller.hostname}")
    logger.info(f"Dry run mode: {controller.dry_run}")
    app.run(host='0.0.0.0', port=8080)
