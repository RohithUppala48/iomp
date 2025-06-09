import {
  CallControls,
  CallingState,
  CallParticipantsList,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { LayoutListIcon, LoaderIcon, UsersIcon, MessageSquareIcon, TimerIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import EndCallButton from "./EndCallButton";
import CodeEditor from "./CodeEditor";
import { cn } from "@/lib/utils";

function MeetingRoom() {
  const router = useRouter();
  const [layout, setLayout] = useState<"grid" | "speaker">("speaker");
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const { useCallCallingState } = useCallStateHooks();
  const call = useCall();
  const callingState = useCallCallingState();
  const { user } = useUser();

  // Fetch interview details
  const interviewId = call?.id;
  const interview = useQuery(
    api.interviews.getInterviewByStreamCallId,
    interviewId ? { streamCallId: interviewId } : "skip"
  );

  const isInterviewer = user?.id !== interview?.candidateId;

  // Timer effect - Memoize the format function
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callingState === CallingState.JOINED) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callingState]);

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoaderIcon className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem-1px)]">
      {/* Top Bar */}
      <div className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TimerIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formatTime(elapsedTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{call?.state.custom?.description || "Interview"}</span>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={35} minSize={25} maxSize={100} className="relative">
          {/* VIDEO LAYOUT */}
          <div className="absolute inset-0">
            {layout === "grid" ? <PaginatedGridLayout /> : <SpeakerLayout />}

            {/* PARTICIPANTS LIST OVERLAY */}
            {showParticipants && (
              <div className="absolute right-0 top-0 h-full w-[300px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-l">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Participants</h3>
                </div>
                <CallParticipantsList onClose={() => setShowParticipants(false)} />
              </div>
            )}

            {/* CHAT PANEL */}
            {showChat && (
              <div className="absolute right-0 top-0 h-full w-[300px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-l">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Chat</h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">Chat functionality coming soon...</p>
                </div>
              </div>
            )}
          </div>

          {/* VIDEO CONTROLS */}
          <div className="absolute bottom-4 left-0 right-0">
            <div className="flex items-center gap-2 flex-wrap justify-center px-4">
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-full p-2 shadow-lg">
                <CallControls onLeave={() => router.push("/")} />

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="size-10 rounded-full">
                        <LayoutListIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setLayout("grid")}>
                        Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLayout("speaker")}>
                        Speaker View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("size-10 rounded-full", showParticipants && "bg-primary text-primary-foreground")}
                    onClick={() => setShowParticipants(!showParticipants)}
                  >
                    <UsersIcon className="size-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("size-10 rounded-full", showChat && "bg-primary text-primary-foreground")}
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageSquareIcon className="size-4" />
                  </Button>

                  <EndCallButton />
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {!(interview?.isCodeSubmitted && isInterviewer) && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65} minSize={25}>
              {interview === undefined ? (
                <div className="flex items-center justify-center h-full">
                  <LoaderIcon className="size-6 animate-spin" />
                  <p className="ml-2">Loading code editor...</p>
                </div>
              ) : interview === null ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-red-500">Error: Could not load interview details</p>
                </div>
              ) : (
                <CodeEditor interview={interview} />
              )}
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

export default MeetingRoom;
