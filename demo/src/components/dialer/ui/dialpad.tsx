"use client";

import { Button } from "@/components/ui/button";
import { SipStatus, useSipState } from 'react-jssip';

interface DialpadProps {
  onNumberClick: (number: string) => void;
}

const dialpadNumbers = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export function Dialpad({ onNumberClick }: DialpadProps) {
  const { sipStatus } = useSipState();

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {dialpadNumbers.map((row) =>
        row.map((number) => (
          <Button
            disabled={sipStatus !== SipStatus.Registered}
            key={number}
            variant="default"
            size="lg"
            className="h-14 text-xl font-semibold "
            onClick={() => onNumberClick(number)}
          >
            {number}
          </Button>
        ))
      )}
    </div>
  );
}
