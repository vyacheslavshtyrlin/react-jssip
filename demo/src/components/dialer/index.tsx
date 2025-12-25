import { useUserData } from "@/hook/useUserData";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { DialerCard } from "./ui/dialer-card";
import { SipStatusBadge } from "./ui/sip-status";
import { useSipState } from "react-jssip-kit";

function Dialer() {
  const { user } = useUserData();
  const { sipStatus } = useSipState();
  return (
    <Card className="w-sm gap-4 h-2xl flex flex-col mx-auto">
      <CardHeader className="flex  my-2 flex-row justify-between items-center">
        <div>
          <CardTitle>SIP USER</CardTitle>
          <CardDescription>{user.login}</CardDescription>
        </div>
        <SipStatusBadge status={sipStatus} />
      </CardHeader>
      <CardContent className="flex flex-col h-full">
        <DialerCard />
      </CardContent>
    </Card>
  );
}

export default Dialer;
