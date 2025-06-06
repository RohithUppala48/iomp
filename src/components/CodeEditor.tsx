import { CODING_QUESTIONS, LANGUAGES } from "@/constants";
import { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { Doc } from "../../convex/_generated/dataModel"; // Added
import { useMutation } from "convex/react"; // Added
import { api } from "../../convex/_generated/api"; // Already here but confirm
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertCircleIcon, BookIcon, LightbulbIcon, PlayIcon } from "lucide-react";
import Editor from "@monaco-editor/react";
import { Button } from "./ui/button";
import { useAction } from "convex/react";
// api is already imported via useMutation, no need for duplicate
import { Loader2Icon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import toast from "react-hot-toast";
import { editor } from "monaco-editor"; // Added for editor instance type
import { useUser } from "@clerk/nextjs"; // Added for user context

// import debounce from "lodash.debounce"; // Removed due to install issues

interface CodeEditorProps {
  interview: Doc<"interviews">;
}

function CodeEditor({ interview }: CodeEditorProps) {
  const { user } = useUser(); // Get current user
  const isCandidate = user?.id === interview?.candidateId;

  // Initialize selectedQuestion based on interview.selectedQuestionId or default
  const [selectedQuestion, setSelectedQuestion] = useState(() => {
    const questionId = interview?.selectedQuestionId;
    return CODING_QUESTIONS.find(q => q.id === questionId) || CODING_QUESTIONS[0];
  });

  // Initialize language from interview or default
  const [language, setLanguage] = useState<"javascript" | "python" | "java">(
    interview.currentLanguage as "javascript" | "python" | "java" || LANGUAGES[0].id
  );
  // Initialize code from interview or starter code
  const [code, setCode] = useState(
    interview.currentCode || selectedQuestion.starterCode[language]
  );
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null); // For Monaco editor instance

  const executeCode = useAction(api.codeExecution.executeCode);
  const updateInterviewCode = useMutation(api.interviews.updateInterviewCode);
  const updateInterviewLanguage = useMutation(api.interviews.updateInterviewLanguage);
  const updateInterviewQuestion = useMutation(api.interviews.updateInterviewQuestion); // Added

  // // Debounced function to update code in Convex - REMOVED
  // const debouncedUpdateCode = useRef(
  //   debounce(async (newCode: string) => {
  //     if (interview?._id) {
  //       try {
  //         await updateInterviewCode({
  //           interviewId: interview._id,
  //           code: newCode,
  //         });
  //       } catch (error) {
  //         console.error("Failed to update code:", error);
  //         toast.error("Error saving code changes.");
  //       }
  //     }
  //   }, 1000) // 1 second debounce
  // ).current;


  // Effect to update local code when interview.currentCode changes from remote
  useEffect(() => {
    if (interview?.currentCode && interview.currentCode !== code) {
      // Check if editor value is different before setting to prevent loops
      if (editorRef.current && editorRef.current.getValue() !== interview.currentCode) {
        setCode(interview.currentCode);
        // Optionally, directly set editor value if setCode doesn't update it immediately or causes issues
        // editorRef.current.setValue(interview.currentCode);
      }
    }
  }, [interview?.currentCode]);

  // Effect to update local language when interview.currentLanguage changes from remote
  useEffect(() => {
    // console.log("Remote language effect: interview.currentLanguage =", interview?.currentLanguage, "local language =", language);
    if (interview?.currentLanguage && interview.currentLanguage !== language) {
      // console.log("Updating local language from remote:", interview.currentLanguage);
      const newLanguage = interview.currentLanguage as "javascript" | "python" | "java";
      const oldStarterCode = selectedQuestion.starterCode[language]; // Use language before it's updated

      setLanguage(newLanguage);

      // If current code was the starter code for the OLD language, update code to new language's starter code
      // Or if there was no currentCode from interview (implying it's a fresh state for this question)
      if (code === oldStarterCode || !interview.currentCode) {
        // console.log("Remote language change: Updating code to starter for new language", newLanguage);
        setCode(selectedQuestion.starterCode[newLanguage]);
        // NO updateInterviewCode here, this is reacting to a remote change.
        // The user who initiated the language change would have pushed the new starter code.
      }
    }
  }, [interview?.currentLanguage, selectedQuestion, code, interview?.currentCode]); // Added dependencies

  // Effect to update local selectedQuestion and code when interview.selectedQuestionId changes from remote
  useEffect(() => {
    const remoteQuestionId = interview?.selectedQuestionId;
    // console.log("Remote question effect: remoteQuestionId =", remoteQuestionId, "local selectedQuestion.id =", selectedQuestion.id);
    if (remoteQuestionId && remoteQuestionId !== selectedQuestion.id) {
      const newQuestion = CODING_QUESTIONS.find(q => q.id === remoteQuestionId);
      if (newQuestion) {
        // console.log("Updating local question from remote:", newQuestion.id);
        const oldStarterCode = selectedQuestion.starterCode[language];
        setSelectedQuestion(newQuestion);

        // If current code was the starter code for the OLD question, update code to new question's starter code
        // Or if there was no currentCode from interview
        if (code === oldStarterCode || !interview.currentCode) {
          const newStarterCode = newQuestion.starterCode[language];
          // console.log("Remote question change: Updating code to starter for new question", newStarterCode);
          setCode(newStarterCode);
          // Persist this change because a remote question change implies a reset to that question's starter code
          // unless the user had already started typing something else (interview.currentCode would exist).
          // This call might be debated: if another user changes the question, should it wipe current user's code if they touched it?
          // The condition `!interview.currentCode` tries to protect this.
          // However, `handleQuestionChange` *always* sends starter code.
          // For consistency, if remote Q changes, and code was old starter, new starter is sent.
          if (interview?._id && (!interview.currentCode || code === oldStarterCode) ) {
            updateInterviewCode({ interviewId: interview._id, code: newStarterCode }).catch(e => console.error("Failed to update code on remote Q change",e));
          }
        }
      }
    } else if (!remoteQuestionId && selectedQuestion.id !== CODING_QUESTIONS[0].id) {
      // console.log("Remote question cleared, resetting to default");
      const defaultQuestion = CODING_QUESTIONS[0];
      const oldStarterCode = selectedQuestion.starterCode[language];
      setSelectedQuestion(defaultQuestion);
      if (code === oldStarterCode || !interview.currentCode) {
        const newStarterCode = defaultQuestion.starterCode[language];
        setCode(newStarterCode);
        if (interview?._id && (!interview.currentCode || code === oldStarterCode)) {
            updateInterviewCode({ interviewId: interview._id, code: newStarterCode }).catch(e => console.error("Failed to update code on remote Q clear",e));
        }
      }
    }
  }, [interview?.selectedQuestionId, language, interview?.currentCode]); // Refined dependencies

  // Initialize code based on selectedQuestion and interview.currentCode (after selectedQuestion is determined)
  // This effect is crucial for setting the *initial* code correctly, especially considering persisted code.
  useEffect(() => {
    if (interview.currentCode) {
      // If there's currentCode in interview, it takes precedence,
      // unless the selectedQuestion has just changed AND the currentCode was for the *previous* question
      // This logic is tricky; the main code sync effect might handle this better.
      // For now, let's ensure that initial load or question change respects currentCode if present.
      if (interview.currentCode !== code) {
         // This check is to prevent loops if currentCode from prop is already set
        if (editorRef.current?.getValue() !== interview.currentCode) {
            setCode(interview.currentCode);
        }
      }
    } else {
      // No currentCode from interview, use starter code of the current selectedQuestion
      setCode(selectedQuestion.starterCode[language]);
    }
  }, [selectedQuestion, language, interview.currentCode]); // Dependencies refined


  const handleCodeChange = async (newCode: string | undefined) => {
    if (newCode === undefined) return;
    setCode(newCode);
    if (interview?._id) {
      // Call mutation directly without debounce
      try {
        await updateInterviewCode({
          interviewId: interview._id,
          code: newCode,
        });
      } catch (error) {
        console.error("Failed to update code:", error);
        // Consider a less intrusive error message for frequent updates
        // toast.error("Error saving code changes.");
      }
    }
  };

  const handleLanguageChange = async (newLanguage: "javascript" | "python" | "java") => {
    if (newLanguage === language) return;

    // console.log("Local language change: newLanguage =", newLanguage);
    const newStarterCode = selectedQuestion.starterCode[newLanguage];

    setLanguage(newLanguage);
    setCode(newStarterCode); // Always set code to new language's starter code on local change
    setResults(null);

    if (interview?._id) {
      try {
        // console.log("Sending language update to Convex:", newLanguage);
        await updateInterviewLanguage({
          interviewId: interview._id,
          language: newLanguage,
        });
        // console.log("Sending new starter code to Convex:", newStarterCode);
        await updateInterviewCode({ // Also send the new starter code
          interviewId: interview._id,
          code: newStarterCode,
        });
      } catch (error) {
        console.error("Failed to update language or code:", error);
        toast.error("Error saving language change.");
      }
    }
  };


  const handleQuestionChange = async (newQuestionId: string) => {
    const newQuestion = CODING_QUESTIONS.find((q) => q.id === newQuestionId);
    if (newQuestion && newQuestion.id !== selectedQuestion.id) {
      setSelectedQuestion(newQuestion);
      setCode(newQuestion.starterCode[language]); // Set to new question's starter code
      setResults(null); // Clear results

      if (interview?._id) {
        try {
          await updateInterviewQuestion({
            interviewId: interview._id,
            questionId: newQuestionId,
          });
          // Also, when user manually changes question, we can assume they want to clear current remote code
          // or let the new starter code become the current code.
          // Let's send this new starter code to Convex.
          await updateInterviewCode({
            interviewId: interview._id,
            code: newQuestion.starterCode[language],
          });
        } catch (error) {
          console.error("Failed to update question or code:", error);
          toast.error("Error saving question change.");
        }
      }
    }
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    try {
      const result = await executeCode({
        questionId: selectedQuestion.id,
        language,
        code,
      });
      setResults(result);
      if (result.allPassed) {
        toast.success("All test cases passed! 🎉");
      } else {
        toast.error("Some test cases failed. Check the results below.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Error executing code: " + errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ResizablePanelGroup direction="vertical" className="min-h-[calc-100vh-4rem-1px]">
      {/* QUESTION SECTION */}
      <ResizablePanel>
        <ScrollArea className="h-full">
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {selectedQuestion.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose your language and solve the problem
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedQuestion.id}
                    onValueChange={handleQuestionChange}
                    disabled={!isCandidate}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select question" />
                    </SelectTrigger>
                    <SelectContent>
                      {CODING_QUESTIONS.map((q) => (
                        <SelectItem key={q.id} value={q.id} disabled={!isCandidate}>
                          {q.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={language}
                    onValueChange={handleLanguageChange}
                    disabled={!isCandidate}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <img
                            src={`/${language}.png`}
                            alt={language}
                            className="w-5 h-5 object-contain"
                          />
                          {LANGUAGES.find((l) => l.id === language)?.name}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.id} disabled={!isCandidate}>
                          <div className="flex items-center gap-2">
                            <img
                              src={`/${lang.id}.png`}
                              alt={lang.name}
                              className="w-5 h-5 object-contain"
                            />
                            {lang.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PROBLEM DESC. */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <BookIcon className="h-5 w-5 text-primary/80" />
                  <CardTitle>Problem Description</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-line">{selectedQuestion.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* PROBLEM EXAMPLES */}
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full w-full rounded-md border">
                    <div className="p-4 space-y-4">
                      {selectedQuestion.examples.map((example, index) => (
                        <div key={index} className="space-y-2">
                          <p className="font-medium text-sm">Example {index + 1}:</p>
                          <ScrollArea className="h-full w-full rounded-md">
                            <pre className="bg-muted/50 p-3 rounded-lg text-sm font-mono">
                              <div>Input: {example.input}</div>
                              <div>Output: {example.output}</div>
                              {example.explanation && (
                                <div className="pt-2 text-muted-foreground">
                                  Explanation: {example.explanation}
                                </div>
                              )}
                            </pre>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      ))}
                    </div>
                    <ScrollBar />
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* CONSTRAINTS */}
              {selectedQuestion.constraints && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Constraints:</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {selectedQuestion.constraints.map((constraint, index) => (
                      <li key={index}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* RESULTS */}
              {results && (
                <Card>
                  <CardHeader className="flex flex-row items-center gap-2">
                    <CardTitle>Test Results</CardTitle>
                    {results.allPassed ? (
                      <CheckCircle2Icon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.results.map((result: any, index: number) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">Test Case {index + 1}:</p>
                            {result.passed ? (
                              <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div className="bg-muted/50 p-3 rounded-lg text-sm font-mono space-y-1">
                            <div>Input: {result.input}</div>
                            <div>Expected: {result.expected}</div>
                            {result.error ? (
                              <div className="text-red-500">Error: {result.error}</div>
                            ) : (
                              <div>Actual: {result.actual}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <ScrollBar />
        </ScrollArea>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* CODE EDITOR */}
      <ResizablePanel defaultSize={60} maxSize={100}>
        <div className="h-full relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              onClick={handleRunCode}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  Run Code
                </>
              )}
            </Button>
          </div>
          <Editor
            height={"100%"}
            defaultLanguage={language}
            language={language}
            theme="vs-dark"
            value={code}
            onMount={(editor) => editorRef.current = editor} // Store editor instance
            onChange={handleCodeChange} // onChange will respect readOnly internally
            options={{
              readOnly: !isCandidate, // Set readOnly option for Monaco editor
              minimap: { enabled: false },
              fontSize: 18,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              wordWrap: "on",
              wrappingIndent: "indent",
            }}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default CodeEditor;
