import { describe, expect, test } from "bun:test";
import { RTCPeerConnection as NodeRTCPeerConnection } from "node-datachannel/polyfill";

const nightlyDescribe =
	process.env.CYRUS_NIGHTLY_WEBRTC === "1" ? describe : describe.skip;

function waitForDataChannel(
	pc: RTCPeerConnection,
	label: string
): Promise<RTCDataChannel> {
	return new Promise((resolve, reject) => {
		pc.addEventListener("datachannel", (event) => {
			if (event.channel.label === label) {
				resolve(event.channel);
			}
		});
		pc.addEventListener("connectionstatechange", () => {
			if (pc.connectionState === "failed") {
				reject(new Error("peer connection failed"));
			}
		});
	});
}

function waitForOpen(channel: RTCDataChannel): Promise<void> {
	return new Promise((resolve, reject) => {
		channel.addEventListener("open", () => resolve(), { once: true });
		channel.addEventListener(
			"error",
			() => reject(new Error("channel error")),
			{
				once: true,
			}
		);
	});
}

nightlyDescribe("node-datachannel nightly", () => {
	test("exchanges a message over a local data channel", async () => {
		const caller = new NodeRTCPeerConnection({
			iceServers: [],
		}) as unknown as RTCPeerConnection;
		const callee = new NodeRTCPeerConnection({
			iceServers: [],
		}) as unknown as RTCPeerConnection;

		try {
			const calleeChannelPromise = waitForDataChannel(callee, "nightly");
			const callerChannel = caller.createDataChannel("nightly");

			caller.addEventListener("icecandidate", (event) => {
				if (event.candidate) {
					callee.addIceCandidate(event.candidate).catch(() => undefined);
				}
			});
			callee.addEventListener("icecandidate", (event) => {
				if (event.candidate) {
					caller.addIceCandidate(event.candidate).catch(() => undefined);
				}
			});

			const offer = await caller.createOffer();
			await caller.setLocalDescription(offer);
			await callee.setRemoteDescription(offer);
			const answer = await callee.createAnswer();
			await callee.setLocalDescription(answer);
			await caller.setRemoteDescription(answer);

			const calleeChannel = await calleeChannelPromise;
			await Promise.all([
				waitForOpen(callerChannel),
				waitForOpen(calleeChannel),
			]);

			const received = new Promise<string>((resolve) => {
				calleeChannel.addEventListener("message", (event) => {
					resolve(String(event.data));
				});
			});

			callerChannel.send("nightly-ping");
			expect(await received).toBe("nightly-ping");
		} finally {
			caller.close();
			callee.close();
		}
	}, 30_000);
});
