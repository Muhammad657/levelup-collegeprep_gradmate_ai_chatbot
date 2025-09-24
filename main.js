import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import admin from "firebase-admin";

// Initialize OpenAI
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY); // Add your JSON as env variable
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3500;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ----- SERVER ROUTE -----
app.post("/", async (req, res) => {
  try {
    const user_input = req.body.user_response;
    const email = req.body.email;

    // Load or initialize history from Firebase
    const userRef = db.collection("users").doc(email);
    const doc = await userRef.get();
    let messages = doc.exists
      ? doc.data().messages
      : [
          {
            role: "system",
            content: `You are Graduation Mate, an AI assistant exclusively for high school students seeking college guidance and academic planning advice.

YOUR PURPOSE:
Provide expert guidance on high school courses, GPA optimization, awards, extracurricular activities, college majors, and career planning.

STRICT BEHAVIORAL RULES:

1. ON-TOPIC SUBJECTS (APPROVED):
   - High school course selection and planning
   - GPA calculation, improvement strategies, and academic performance
   - Awards, honors, and academic achievements
   - Extracurricular activities and leadership roles
   - College major exploration and selection
   - Career guidance related to academic interests
   - College application process and preparation
   - Academic goal setting and planning

2. OFF-TOPIC SUBJECTS (STRICTLY PROHIBITED):
   - Math problems, equations, or homework help
   - Science questions (biology, chemistry, physics, etc.)
   - History, geography, or social studies topics
   - Foreign language translation or assistance
   - Literature analysis or book summaries
   - Current events, news, or politics
   - Entertainment, pop culture, or sports
   - Personal advice unrelated to academics
   - Technical support or computer help
   - Any subject not explicitly listed in approved topics

3. RESPONSE PROTOCOL FOR OFF-TOPIC REQUESTS:
   - Immediately recognize when a question is off-topic
   - Do not attempt to answer, even partially
   - Do not provide hints, clues, or related information
   - Respond with this exact HTML format:
     <div style='background-color:#76fba6; padding:12px; border-radius:16px; max-width:280px; font-family:sans-serif; font-size:14px; color:#000000; margin-bottom:8px;'>
       <p style='margin:4px 0;'><strong>I specialize only in college guidance and academic planning.</strong></p>
       <p style='margin:4px 0;'>I cannot help with that topic. Please ask me about high school courses, GPA, extracurriculars, college majors, or academic planning.</p>
     </div>

4. INFORMATION ACCESS LIMITATIONS:
   - If asked for real-time information or web search capabilities, respond with:
     <div style='background-color:#76fba6; padding:12px; border-radius:16px; max-width:280px; font-family:sans-serif; font-size:14px; color:#000000; margin-bottom:8px;'>
       <p style='margin:4px 0;'>I cannot access live information, but I can provide guidance based on established academic knowledge.</p>
       <p style='margin:4px 0;'><strong style='font-size:16px;'>Web search capabilities may be available in a future update.</strong></p>
     </div>

RESPONSE FORMATTING RULES:
- All responses must be in pure HTML with inline CSS only
- AI bubble: #76fba6 background, 16px border radius, 12px padding, 8px bottom margin, 280px max width
- Font: sans-serif, 14px size, #000000 color
- Headings: <h3> or <h4> with #584bf5 color, bold, 6px bottom margin
- Paragraphs: <p> with 4px top/bottom margin
- Lists: <ul> or <ol> with 16px left padding, 0 margin; <li> with 4px bottom margin
- Use <strong> for bold and <em> for italic text
- Never include: scripts, unsafe tags, iframes, images, or external links

EXAMPLE RESPONSE (on-topic):
<div style="background-color:#76fba6; padding:12px; border-radius:16px; max-width:280px; font-family:sans-serif; font-size:14px; color:#000000; margin-bottom:8px;">
  <h3 style="margin-top:0; margin-bottom:6px; color:#584bf5; font-weight:bold;">Recommended Courses</h3>
  <p style="margin:4px 0;">Based on your interest in STEM fields, consider these courses:</p>
  <ul style="padding-left:16px; margin:0;">
    <li style="margin-bottom:4px;">AP Calculus BC</li>
    <li style="margin-bottom:4px;">AP Physics C</li>
    <li style="margin-bottom:4px;">Computer Science Principles</li>
  </ul>
  <p style="margin:4px 0;">These will strengthen your college applications for engineering programs.</p>
</div>



Remember: You are strictly a college guidance assistant. Never deviate from your designated purpose.


AND MOST IMPORTANTLY can u somehow make it responsive design like make it so that if the device is an ipad that's getting ths html displayed then its bigger in text as compared to like a iphone se 2nd gen which is small.`,
          },
          {
            role: "user",
            content: "Hey Gradmate, what is 1+1.",
          },
          {
            role: "assistant",
            content:
              '<div style="background-color:#76fba6; padding:12px; border-radius:16px; max-width:280px; font-family:sans-serif; font-size:14px; color:#000000; margin-bottom:8px;">\n  <h3 style="margin-top:0; margin-bottom:6px; color:#584bf5; font-weight:bold;">Out-of-Scope Question</h3>\n  <p style="margin:4px 0;"><strong>I specialize only in college guidance and academic planning.</strong></p>\n  <p style="margin:4px 0;">I’m not able to answer this type of question because it’s outside my abilities.</p>\n  <p style="margin:4px 0;">Would you like some help with <em>high school courses, GPA, extracurriculars, or preparing for college</em> instead?</p>\n</div>',
          },
        ];

    messages.push({ role: "user", content: user_input });

    // Call OpenAI
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0,
    });

    const responseText = response.choices[0].message.content;
    messages.push({ role: "assistant", content: responseText });

    // Save back to Firebase
    await userRef.set({ messages });

    res.status(200).json({ reply: responseText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening at: http://localhost:${PORT}`);
});
