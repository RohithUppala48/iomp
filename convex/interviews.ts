import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAllInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interviews = await ctx.db.query("interviews").collect();

    return interviews;
  },
});

export const updateInterviewQuestion = mutation({
  args: {
    interviewId: v.id("interviews"),
    questionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    if (identity.subject !== interview.candidateId) {
      throw new Error("User is not authorized to make changes to this interview's question.");
    }

    return await ctx.db.patch(args.interviewId, {
      selectedQuestionId: args.questionId,
    });
  },
});

export const getMyInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const interviews = await ctx.db
      .query("interviews")
      .withIndex("by_candidate_id", (q) => q.eq("candidateId", identity.subject))
      .collect();

    return interviews!;
  },
});

export const getInterviewById = query({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    // TODO: Add authorization if needed to restrict who can fetch by ID.
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");
    return await ctx.db.get(args.interviewId);
  },
});

export const getInterviewByStreamCallId = query({
  args: { streamCallId: v.string() },
  handler: async (ctx, args) => {
    // TODO: Add authorization if needed
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) throw new Error("Unauthorized");
    return await ctx.db
      .query("interviews")
      .withIndex("by_stream_call_id", (q) => q.eq("streamCallId", args.streamCallId))
      .first();
  },
});

export const createInterview = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    status: v.string(),
    streamCallId: v.string(),
    candidateId: v.string(),
    interviewerIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("interviews", {
      ...args,
    });
  },
});

export const updateInterviewCode = mutation({
  args: {
    interviewId: v.id("interviews"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    if (identity.subject !== interview.candidateId) {
      throw new Error("User is not authorized to make changes to this interview's code.");
    }

    return await ctx.db.patch(args.interviewId, {
      currentCode: args.code,
    });
  },
});

export const updateInterviewLanguage = mutation({
  args: {
    interviewId: v.id("interviews"),
    language: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) throw new Error("Interview not found");

    if (identity.subject !== interview.candidateId) {
      throw new Error("User is not authorized to make changes to this interview's language.");
    }

    return await ctx.db.patch(args.interviewId, {
      currentLanguage: args.language,
    });
  },
});

export const updateInterviewStatus = mutation({
  args: {
    id: v.id("interviews"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      ...(args.status === "completed" ? { endTime: Date.now() } : {}),
    });
  },
});

export const submitCurrentCode = mutation({
  args: { interviewId: v.id("interviews") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const interview = await ctx.db.get(args.interviewId);
    if (!interview) {
      throw new Error("Interview not found");
    }

    // Ensure the user is the candidate for this interview
    if (identity.subject !== interview.candidateId) {
      throw new Error("User is not authorized to submit code for this interview.");
    }

    return await ctx.db.patch(args.interviewId, {
      submittedCode: interview.currentCode,
      submittedLanguage: interview.currentLanguage,
      isCodeSubmitted: true,
    });
  },
});

export const getAllSubmittedInterviews = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // TODO: Add role-based authorization if only specific users (e.g., admins, interviewers)
    // should be able to access all submissions.
    if (!identity) {
      // Or, if public access to submissions is intended, remove this check.
      // For now, let's assume only authenticated users can see this.
      // Depending on product requirements, might need fine-grained roles.
      // e.g. if (identity.role !== "admin" && identity.role !== "interviewer") throw new Error("Unauthorized");
      throw new Error("Unauthorized: Must be logged in to view submissions.");
    }

    const interviewsQuery = ctx.db
      .query("interviews")
      .filter((q) => q.eq(q.field("isCodeSubmitted"), true))
      .order("desc"); // Orders by _creationTime descending by default

    const interviews = await interviewsQuery.collect();

    const interviewsWithCandidateDetails = await Promise.all(
      interviews.map(async (interview) => {
        if (!interview.candidateId) {
          return {
            ...interview,
            candidateName: "N/A",
            candidateEmail: "N/A",
          };
        }
        const candidate = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("clerkId"), interview.candidateId))
          .first();
        return {
          ...interview,
          candidateName: candidate?.name ?? "N/A",
          candidateEmail: candidate?.email ?? "N/A",
        };
      })
    );

    return interviewsWithCandidateDetails;
  },
});
