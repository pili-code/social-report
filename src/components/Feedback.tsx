"use client";

import dynamic from "next/dynamic";

const FeedbackWidget = dynamic(
  () => import("@thedesignproject/feedback-widget").then((m) => m.FeedbackWidget),
  { ssr: false }
);

export default function Feedback() {
  return (
    <FeedbackWidget
      projectId="gtm-hub"
      apiBase="https://feedback-widget-sigma.vercel.app"
    />
  );
}
