"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = require("net");
class OCSocket {
    constructor(socket) {
        this.seq = 1;
        this.buf = Buffer.alloc(0);
        this.currResolve = null;
        this.currReject = null;
        this.socket = socket;
        socket.on("data", data => {
            let newData = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
            this.buf = Buffer.concat([this.buf, newData]);
            if (this.currResolve)
                this.currResolve();
        });
        socket.on("close", data => {
            if (this.currReject)
                this.currReject(new Error("The socket was closed"));
        });
        socket.on("error", err => {
            if (this.currReject)
                this.currReject(err);
        });
    }
    readExact(n) {
        return new Promise((resolve, reject) => {
            if (this.currResolve || this.currReject)
                reject("Another thread is already using this socket");
            this.currReject = (err) => {
                this.currReject = null;
                this.currResolve = null;
                reject(err);
            };
            this.currResolve = () => {
                if (this.buf.length >= n) {
                    this.currReject = null;
                    this.currResolve = null;
                    const chunk = this.buf.subarray(0, n);
                    this.buf = this.buf.subarray(n);
                    resolve(chunk);
                }
            };
        });
    }
    async readPacket() {
        const lengthBuf = await this.readExact(2);
        const length = lengthBuf.readUint16LE(0);
        const packetBuf = await this.readExact(length);
        const opcode = packetBuf.readUint16LE(0);
        const seq = packetBuf.readUint16LE(2);
        return {
            opcode: opcode,
            seq: seq,
            data: packetBuf.subarray(4)
        };
    }
    writePacket(packet) {
        const buf = Buffer.alloc(2 + 4 + packet.data.length);
        buf.writeUint16LE(4 + packet.data.length, 0);
        buf.writeUint16LE(packet.opcode, 2);
        buf.writeUint16LE(packet.seq, 4);
        packet.data.copy(buf, 6);
        this.socket.write(buf);
    }
    async executeLua(lua) {
        const seq = this.seq++;
        // send lua
        const luaUtf8 = Buffer.from(lua, "utf-8");
        const dataBuf = Buffer.alloc(luaUtf8.length + 2);
        dataBuf.writeUint16LE(luaUtf8.length);
        luaUtf8.copy(dataBuf, 2);
        this.writePacket({
            opcode: 1,
            seq: seq,
            data: dataBuf
        });
        // wait for in-progress
        const resp1 = await this.readPacket();
        if (resp1.opcode !== 2 || resp1.seq !== seq)
            throw new Error("Protocol error");
        // wait for 2nd in-progress
        const resp2 = await this.readPacket();
        if ((resp2.opcode !== 3 && resp2.opcode !== 4) || resp2.seq !== seq)
            throw new Error("Protocol error");
        // read body
        const len = resp2.data.readUint16LE(0);
        const res = resp2.data.subarray(2, 2 + len);
        if (res.length !== len)
            throw new Error("Unexpected end of packet");
        return res.toString("utf-8");
    }
}
(0, net_1.createServer)(async (socket) => {
    try {
        console.log("got connection: " + socket.remoteAddress);
        const ocSocket = new OCSocket(socket);
        console.log("executing lua...");
        const res = await ocSocket.executeLua(`return require("computer").address()`);
        console.log("got result: " + res);
    }
    catch (e) {
        console.log(e);
    }
}).listen(18320);
