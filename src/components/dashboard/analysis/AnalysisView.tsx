"use client"

import { SenderTable } from "./SenderTable"
import { AnalysisHeader } from "./AnalysisHeader"
import { AnalysisFooter } from "./AnalysisFooter"

export default function AnalysisView() {
  return (
    <div className="w-full h-full flex flex-col">
      <AnalysisHeader />

      {/* TABLE CONTAINER */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <SenderTable />
        </div>
      </div>

      <AnalysisFooter />
    </div>
  )
}
