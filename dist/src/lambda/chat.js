"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const handler = async (event) => {
    try {
        if (event.requestContext.http.method !== 'POST') {
            return resp(405, { error: 'Method not allowed' });
        }
        const body = event.body ? JSON.parse(event.body) : {};
        const messages = body.messages;
        const model = body.model ?? 'gpt-4o-mini';
        if (!Array.isArray(messages) || messages.length === 0) {
            return resp(400, { error: 'messages[] required' });
        }
        const input = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
        const result = await client.responses.create({ model, input });
        const text = result.output_text ?? '';
        return resp(200, { text });
    }
    catch (err) {
        console.error(err);
        return resp(500, { error: 'Internal error', detail: err?.message || String(err) });
    }
};
exports.handler = handler;
function resp(statusCode, body) {
    return {
        statusCode,
        headers: {
            'content-type': 'application/json',
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*'
        },
        body: JSON.stringify(body)
    };
}
