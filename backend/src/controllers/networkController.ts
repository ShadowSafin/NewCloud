import { Request, Response } from "express";
import os from "os";
import { config } from "../config";

export class NetworkController {
  getStatus(req: Request, res: Response) {
    try {
      const interfaces = os.networkInterfaces();
      const ips: string[] = [];

      for (const name of Object.keys(interfaces)) {
        const ifaceList = interfaces[name];
        if (!ifaceList) continue;

        for (const iface of ifaceList) {
          // Skip internal (127.0.0.1) and non-IPv4 addresses
          if (iface.family === "IPv4" && !iface.internal) {
            ips.push(iface.address);
          }
        }
      }

      // Use host LAN IP passed from env if available
      if (process.env.HOST_LAN_IP && !ips.includes(process.env.HOST_LAN_IP)) {
        ips.unshift(process.env.HOST_LAN_IP);
      }

      // Identify primary IP: prefer HOST_LAN_IP first, else standard private network detection
      let primaryIp = process.env.HOST_LAN_IP || ips[0] || "127.0.0.1";
      if (!process.env.HOST_LAN_IP) {
        for (const ip of ips) {
          if (ip.startsWith("192.168.") || ip.startsWith("10.")) {
            primaryIp = ip;
            break;
          }
        }
      }

      const hostNameVal = process.env.HOST_HOSTNAME || os.hostname();
      const machineHostname = hostNameVal.endsWith(".local") ? hostNameVal : `${hostNameVal}.local`;
      const frontendPort = 3000;
      const backendPort = config.port;

      const urls = [
        `http://${primaryIp}:${frontendPort}`,
        `http://${machineHostname}:${frontendPort}`
      ];

      // fallback / secondary mDNS configurations
      if (machineHostname !== "newcloud.local") {
        urls.push(`http://newcloud.local:${frontendPort}`);
      }

      res.json({
        success: true,
        data: {
          ips,
          primaryIp,
          hostname: "newcloud.local",
          machineHostname,
          port: backendPort,
          frontendPort,
          urls
        }
      });
    } catch (error) {
      console.error("[Network] Failed to get network status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch network status"
      });
    }
  }
}
