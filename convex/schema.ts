import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    role: v.union(v.literal("candidate"), v.literal("interviewer")),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  interviews: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
    currentCode: v.optional(v.string()),
    currentLanguage: v.optional(v.string()),
    selectedQuestionId: v.optional(v.string()),
    submittedCode: v.optional(v.string()),
    submittedLanguage: v.optional(v.string()),
    isCodeSubmitted: v.optional(v.boolean()),
    submissions: v.optional(v.array(v.object({
      code: v.string(),
      questionId: v.string(),
      language: v.string(),
      timestamp: v.number(),
      executionResults: v.object({
        allPassed: v.boolean(),
        results: v.array(v.object({
          input: v.string(),
          expected: v.string(),
          actual: v.optional(v.string()),
          passed: v.boolean(),
          error: v.optional(v.string()),
        })),
      }),
    }))),
    lastExecutionResults: v.optional(v.object({
      allPassed: v.boolean(),
      results: v.array(v.object({
        input: v.string(),
        expected: v.string(),
        actual: v.optional(v.string()),
        passed: v.boolean(),
        error: v.optional(v.string()),
      })),
    })),
  })
    .index("by_candidate_id", ["candidateId"])
    .index("by_stream_call_id", ["streamCallId"]),

  comments: defineTable({
    content: v.string(),
    rating: v.number(),
    interviewerId: v.string(),
    interviewId: v.id("interviews"),
  }).index("by_interview_id", ["interviewId"]),
});
