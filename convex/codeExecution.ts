import { action } from "./_generated/server";
import { v } from "convex/values";
import { CODING_QUESTIONS } from "../src/constants";

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const RAPIDAPI_KEY = "0eee68174dmsh205598820d9d906p1c6083jsn963d7c024c6b";
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";

// Updated language IDs for Judge0
const LANGUAGE_IDS: Record<string, number> = {
  javascript: 93, // JavaScript (Node.js 18.15.0)
  python: 71,     // Python (3.8.1)
  java: 62,       // Java (OpenJDK 13.0.1)
};

interface Judge0Response {
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
}

async function runJudge0(code: string, language: string, input: string): Promise<Judge0Response> {
  const language_id = LANGUAGE_IDS[language];
  if (!language_id) throw new Error("Unsupported language");

  // Parse the input string to extract values based on language
  let parsedInput = "";
  const numsMatch = input.match(/nums = (\[.*?\])/);
  const targetMatch = input.match(/target = (\d+)/);

  if (!numsMatch || !targetMatch) {
    throw new Error("Invalid input format");
  }

  // Format input based on language
  switch (language) {
    case "javascript":
      parsedInput = `${numsMatch[1]}\n${targetMatch[1]}`;
      break;
    case "python":
      parsedInput = `${numsMatch[1]}\n${targetMatch[1]}`;
      break;
    case "java":
      parsedInput = `${numsMatch[1]}\n${targetMatch[1]}`;
      break;
    default:
      throw new Error("Unsupported language");
  }

  try {
    // First, create a submission
    const createResponse = await fetch(`${JUDGE0_API_URL}?base64_encoded=false&wait=false`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      body: JSON.stringify({
        source_code: code,
        language_id,
        stdin: parsedInput,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create submission: ${error}`);
    }

    const submission = await createResponse.json();
    const token = submission.token;

    // Poll for results
    let result: Judge0Response | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${JUDGE0_API_URL}/${token}?base64_encoded=false`, {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      });

      if (!statusResponse.ok) {
        throw new Error("Failed to get submission status");
      }

      result = await statusResponse.json();

      // If the submission is done processing
      if (result && result.status && (result.status.id !== 1 && result.status.id !== 2)) {
        break;
      }

      // Wait for 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!result) {
      throw new Error("Timeout waiting for submission result");
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Code execution failed: ${error.message}`);
    }
    throw new Error("Unknown error during code execution");
  }
}

function compareOutputs(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  
  try {
    // Try to parse both as JSON for array/object comparison
    const actualJson = JSON.parse(actual);
    const expectedJson = JSON.parse(expected);
    return JSON.stringify(actualJson) === JSON.stringify(expectedJson);
  } catch {
    // If parsing fails, compare as strings
    return String(actual).trim() === String(expected).trim();
  }
}

export const executeCode = action({
  args: {
    questionId: v.string(),
    language: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const question = CODING_QUESTIONS.find(q => q.id === args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const results = [];
    let allPassed = true;

    for (const example of question.examples) {
      let output = null;
      let error = null;
      let actual = null;

      try {
        const judge0res = await runJudge0(args.code, args.language, example.input);
        
        // Check for compilation errors
        if (judge0res.compile_output) {
          error = judge0res.compile_output;
        }
        // Check for runtime errors
        else if (judge0res.stderr) {
          error = judge0res.stderr;
        }
        // Check for successful execution
        else if (judge0res.stdout) {
          actual = judge0res.stdout.trim();
        }

        const passed = !error && compareOutputs(actual, example.output);
        results.push({
          input: example.input,
          expected: example.output,
          actual,
          passed,
          error,
        });
        allPassed = allPassed && passed;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        results.push({
          input: example.input,
          expected: example.output,
          actual: null,
          passed: false,
          error: errorMessage,
        });
        allPassed = false;
      }
    }

    return {
      allPassed,
      results,
    };
  },
}); 