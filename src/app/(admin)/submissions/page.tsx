"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CODING_QUESTIONS } from "@/constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2Icon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";

// Basic Loader UI component
const LoaderUI = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2Icon className="h-12 w-12 animate-spin text-primary" />
    <p className="ml-4 text-lg">Loading submissions...</p>
  </div>
);

// Helper function to group submissions by question
const groupSubmissionsByQuestion = (submissions: any[]) => {
  return submissions.reduce((acc: any, submission) => {
    // Use the most recent submission's questionId
    const latestSubmission = submission.submissions?.[submission.submissions.length - 1];
    const questionId = latestSubmission?.questionId || submission.selectedQuestionId || 'unknown';
    if (!acc[questionId]) {
      acc[questionId] = [];
    }
    acc[questionId].push(submission);
    return acc;
  }, {});
};

// Helper function to get candidate initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

// Main page component
export default function SubmissionsPage() {
  const submissions = useQuery(api.interviews.getAllSubmittedInterviews);
  const users = useQuery(api.users.getUsers);

  console.log('Submissions:', submissions);
  console.log('Users:', users);

  if (submissions === undefined || users === undefined) {
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

  const groupedSubmissions = groupSubmissionsByQuestion(submissions);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">Code Submissions</h1>
      <div className="space-y-6">
        {Object.entries(groupedSubmissions).map(([questionId, questionSubmissions]: [string, any[]]) => {
          const question = CODING_QUESTIONS.find(q => q.id === questionId) || {
            title: 'Unknown Question',
            description: 'Question details not available'
          };

          return (
            <Card key={questionId}>
              <CardHeader>
                <CardTitle>{question.title}</CardTitle>
                <CardDescription className="whitespace-pre-line">{question.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-4">
                  {questionSubmissions.map((submission) => {
                    const candidate = users.find(u => u.clerkId === submission.candidateId);

                    return (
                      <AccordionItem key={submission._id} value={submission._id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={candidate?.image} />
                                <AvatarFallback>
                                  {getInitials(candidate?.name || 'Unknown User')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-left">
                                <div className="font-medium">{candidate?.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  Latest submission: {format(submission._creationTime, "MMM d, yyyy • h:mm a")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={submission.submittedLanguage === 'python' ? 'default' : 
                                       submission.submittedLanguage === 'javascript' ? 'secondary' : 'outline'}>
                                {submission.submittedLanguage}
                              </Badge>
                              <Badge variant="secondary">
                                {submission.submissions?.length || 0} Submissions
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-6 pt-4">
                            {submission.submissions?.map((sub: any, idx: number) => (
                              <Card key={idx}>
                                <CardHeader className="pb-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                      {format(sub.timestamp, "MMM d, yyyy • h:mm a")}
                                    </div>
                                    <Badge variant={sub.executionResults.allPassed ? "success" : "destructive"}>
                                      {sub.executionResults.allPassed ? "All Tests Passed" : "Tests Failed"}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">Code ({sub.language})</h4>
                                      <div className="rounded-md border overflow-hidden">
                                        <Editor
                                          height="300px"
                                          defaultLanguage={sub.language}
                                          theme="vs-dark"
                                          value={sub.code}
                                          options={{
                                            readOnly: true,
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            lineNumbers: "on",
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 16, bottom: 16 },
                                            wordWrap: "on",
                                            wrappingIndent: "indent",
                                            renderLineHighlight: "none",
                                            domReadOnly: true,
                                            contextmenu: false,
                                            scrollbar: {
                                              vertical: "hidden",
                                              horizontal: "hidden"
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-semibold mb-2">Test Results</h4>
                                      <div className="space-y-3">
                                        {sub.executionResults.results.map((result: any, ridx: number) => (
                                          <div key={ridx} className="rounded-lg border p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Badge variant={result.passed ? "success" : "destructive"}>
                                                Test Case {ridx + 1}
                                              </Badge>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                              <div><span className="font-medium">Input:</span> {result.input}</div>
                                              <div><span className="font-medium">Expected:</span> {result.expected}</div>
                                              {result.error ? (
                                                <div className="text-destructive"><span className="font-medium">Error:</span> {result.error}</div>
                                              ) : (
                                                <div><span className="font-medium">Actual:</span> {result.actual}</div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
