import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import useMeetingActions from "@/hooks/useMeetingActions";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isJoinMeeting: boolean;
}

function MeetingModal({ isOpen, onClose, title, isJoinMeeting }: MeetingModalProps) {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [createdMeetingLink, setCreatedMeetingLink] = useState<string | null>(null);
  const { createInstantMeeting, joinMeeting } = useMeetingActions();
  const router = useRouter(); // Added for navigation

  const handleStart = async () => {
    if (createdMeetingLink) {
      router.push(createdMeetingLink);
      setCreatedMeetingLink(null); // Reset for next time
      onClose();
      return;
    }

    if (isJoinMeeting) {
      const meetingId = meetingUrl.split("/").pop();
      if (meetingId) joinMeeting(meetingId);
    } else {
      const callId = await createInstantMeeting();
      if (callId) {
        const newMeetingLink = `${window.location.origin}/meeting/${callId}`;
        setCreatedMeetingLink(newMeetingLink);
        // Don't navigate immediately, let user copy link or go to meeting
        return; // Return early to prevent closing modal immediately
      }
    }

    // Only close and reset if not creating a link or if creation failed
    if (!isJoinMeeting && !createdMeetingLink) {
      setMeetingUrl("");
      onClose();
    } else if (isJoinMeeting) {
      setMeetingUrl("");
      onClose();
    }
  };

  const handleClose = () => {
    setCreatedMeetingLink(null);
    setMeetingUrl("");
    onClose();
  };

  const copyToClipboard = () => {
    if (createdMeetingLink) {
      navigator.clipboard.writeText(createdMeetingLink).then(() => {
        toast.success("Meeting link copied to clipboard!");
      }).catch(err => {
        console.error("Failed to copy: ", err);
        toast.error("Failed to copy link.");
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {createdMeetingLink ? (
            <>
              <Input value={createdMeetingLink} readOnly />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={copyToClipboard}>
                  Copy Link
                </Button>
                <Button onClick={handleStart}>Go to Meeting</Button>
              </div>
              <div className="flex justify-end">
                 <Button variant="ghost" onClick={handleClose} className="mt-2">Close</Button>
              </div>
            </>
          ) : (
            <>
              {isJoinMeeting && (
                <Input
                  placeholder="Paste meeting link here..."
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                />
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleStart} disabled={isJoinMeeting && !meetingUrl.trim()}>
                  {isJoinMeeting ? "Join Meeting" : "Start Meeting"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export default MeetingModal;
