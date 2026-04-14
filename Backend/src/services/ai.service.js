const Groq = require("groq-sdk")
const { z } = require("zod")
const puppeteer = require("puppeteer")

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

/* -------------------- MODELS (Fallback System) -------------------- */

const MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.3-8b-instant",
    "mixtral-8x7b-32768"
]

async function callGroq(messages) {
    for (let model of MODELS) {
        try {
            const res = await groq.chat.completions.create({
                model,
                messages,
                temperature: 0.7
            })
            return res
        } catch (err) {
            console.log(`❌ Model failed: ${model}`)
        }
    }
    throw new Error("All models failed")
}

/* -------------------- ZOD SCHEMA -------------------- */

const interviewReportSchema = z.object({
    matchScore: z.number(),

    technicalQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })).min(5),   // ✅ FIX

    behavioralQuestions: z.array(z.object({
        question: z.string(),
        intention: z.string(),
        answer: z.string()
    })).min(5),   // ✅ FIX

    skillGaps: z.array(z.object({
        skill: z.string(),
        severity: z.enum(["low", "medium", "high"])
    })),

    preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
    })).min(5),   // ✅ FIX

    title: z.string()
})

/* -------------------- SAFE JSON PARSER -------------------- */

function safeJSONParse(text) {
    try {
        return JSON.parse(text)
    } catch (err) {
        try {
            const cleaned = text.replace(/```json|```/g, "")
            return JSON.parse(cleaned)
        } catch (error) {
            console.error("❌ JSON Parse Error:", text)
            throw new Error("Invalid JSON response from AI")
        }
    }
}

/* -------------------- GENERATE INTERVIEW REPORT -------------------- */

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `
Return ONLY valid JSON. No explanation.

IMPORTANT RULES:
- Generate AT LEAST 6 technical questions
- Generate AT LEAST 6 behavioral questions
- Generate a 7-day preparation plan
- Do NOT return less than required items
- Make answers detailed and practical

Schema:
{
  "matchScore": number,
  "technicalQuestions": [
    { "question": string, "intention": string, "answer": string }
  ],
  "behavioralQuestions": [
    { "question": string, "intention": string, "answer": string }
  ],
  "skillGaps": [
    { "skill": string, "severity": "low" | "medium" | "high" }
  ],
  "preparationPlan": [
    { "day": number, "focus": string, "tasks": string[] }
  ],
  "title": string
}

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`

    try {
        const response = await callGroq([
            { role: "user", content: prompt }
        ])

        const text = response.choices[0].message.content

        const parsed = safeJSONParse(text)

        const validated = interviewReportSchema.parse(parsed)

        return validated

    } catch (error) {
        console.error("❌ Interview Report Error:", error.message)
        throw error
    }
}

/* -------------------- GENERATE PDF FROM HTML -------------------- */

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()
    return pdfBuffer
}

/* -------------------- GENERATE RESUME PDF -------------------- */

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const prompt = `
Return ONLY valid JSON. No explanation.

IMPORTANT:
- Generate clean, professional, ATS-friendly HTML resume
- Keep it 1–2 pages
- Use proper structure (header, skills, projects, experience)

Schema:
{
  "html": string
}

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`

    try {
        const response = await callGroq([
            { role: "user", content: prompt }
        ])

        const text = response.choices[0].message.content

        const jsonContent = safeJSONParse(text)

        const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

        return pdfBuffer

    } catch (error) {
        console.error("❌ Resume PDF Error:", error.message)
        throw error
    }
}

/* -------------------- EXPORT -------------------- */

module.exports = {
    generateInterviewReport,
    generateResumePdf
}