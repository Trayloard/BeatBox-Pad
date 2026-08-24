import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ensureCompatibleFormat } from "@workspace/integrations-openai-ai-server/audio";
import { Buffer } from "node:buffer";

const router = Router();

type Msg = { role: "user" | "assistant"; content: string };
const sessions = new Map<string, Msg[]>();

const SYSTEM_PROMPT = `Du bist ein kreativer Ad-Lib-Karriere-Agent für elektronische und Techno-Musik. Du hilfst Musikern dabei, kurze, hypnotische, repetitive Vokal-Ad-libs für ihre Tracks zu erstellen — inspiriert vom Stil von Tom Dollar ("I see you walking man, see you walking man, oh no") oder ähnlichen elektronischen Vokal-Hooks.

DEIN ABLAUF:

SCHRITT 1 (nur beim ersten Kontakt): Stell dich kurz vor und frag nach den Stilvorlieben:
- Stimme: männlich oder weiblich
- Tonlage: tief/bass oder hoch
- Intensität: stark/kräftig oder weich/leise
- Track-Stimmung: dunkel, aggressiv, aufbauend oder hypnotisch

SCHRITT 2 (nach Erhalt der Vorlieben): Generiere genau 6 Ad-lib-Phrasen. Format:
- Jede Phrase: 3–8 Wörter, für Wiederholung über einem Techno-Beat gemacht
- Sprich jede Phrase langsam und rhythmisch vor, damit der User hört wie sie klingen
- Beispiele: "I see you walking", "feel the energy now", "oh no we move", "this is your time"

REGELN:
- Antworte KURZ und energetisch
- Spreche Ad-libs langsam und mit Pausen vor
- Nur kurze Hooks, KEIN ganzes Lied
- Nach den Ad-libs: frag ob Anpassungen gewünscht sind
- Antworte auf Deutsch wenn der User Deutsch spricht, auf Englisch wenn er Englisch spricht`;

router.post("/adlib/voice", async (req, res) => {
  const { sessionId, audio } = req.body as {
    sessionId: string;
    audio?: string; // base64 encoded raw audio (webm/mp4/wav)
  };

  if (!sessionId) {
    res.status(400).json({ error: "sessionId required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const history: Msg[] = sessions.get(sessionId) ?? [];

    // Build messages for gpt-audio (system + prior turns as text + current audio)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    let userMsgText = "";

    if (!audio) {
      // First turn: text prompt triggers greeting
      userMsgText = "Bitte stell dich vor und frag mich nach meinen Stilvorlieben für die Ad-libs.";
      messages.push({ role: "user", content: userMsgText });
    } else {
      // Convert incoming audio to WAV before sending to gpt-audio
      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: wavBuffer } = await ensureCompatibleFormat(rawBuffer);
      const wavBase64 = wavBuffer.toString("base64");

      messages.push({
        role: "user",
        content: [
          {
            type: "input_audio",
            input_audio: { data: wavBase64, format: "wav" },
          },
        ],
      });
    }

    // Call gpt-audio for speech-to-speech (text + audio out)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (openai.chat.completions.create as any)({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice: "alloy", format: "mp3" },
      messages,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = response.choices[0]?.message as any;
    const audioData: string = msg?.audio?.data ?? "";
    const transcript: string =
      msg?.audio?.transcript ?? (typeof msg?.content === "string" ? msg.content : "") ?? "";
    const userTranscript: string = msg?.audio?.input_transcript ?? "";

    if (userTranscript) {
      send({ type: "user_transcript", data: userTranscript });
    }
    if (audioData) {
      send({ type: "audio", data: audioData });
    }
    if (transcript) {
      send({ type: "transcript", data: transcript });
    }

    // Persist both sides to session history
    history.push({
      role: "user",
      content: userTranscript || userMsgText || "[Spracheingabe]",
    });
    history.push({ role: "assistant", content: transcript });
    sessions.set(sessionId, history);

    send({ done: true });
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send({ error: message });
    res.end();
  }
});

// Clear a session
router.delete("/adlib/session/:sessionId", (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ ok: true });
});

export default router;
