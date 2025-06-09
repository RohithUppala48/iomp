"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api"; // Adjusted path
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2Icon } from "lucide-react"; // For loader

// Basic Loader UI component
const LoaderUI = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
    <p className="ml-4 text-lg">Loading submissions...</p>
  </div>
);

// Main page component
export default function SubmissionsPage() {
  const submissions = useQuery(api.interviews.getAllSubmittedInterviews);

  if (submissions === undefined) {
    return <LoaderUI />;
  }

  if (submissions.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Code Submissions</h1>
        <p>No code submissions found at this time.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">Code Submissions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions.map((submission) => (
          <Card key={submission._id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{submission.title}</CardTitle>
              <CardDescription>
                Candidate: {submission.candidateName} ({submission.candidateEmail})
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              <div className="mb-2">
                <span className="font-semibold">Language:</span> {submission.submittedLanguage}
              </div>
              <div className="flex-grow">
                <span className="font-semibold">Submitted Code:</span>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto h-64">
                  <code>
                    {submission.submittedCode || "// No code submitted"}
                  </code>
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
