'use client'

interface AnalysisTableProps {
  onReanalyze: () => void
}

export default function AnalysisTable({ onReanalyze }: AnalysisTableProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Your Inbox Analysis</h2>
        <button 
          onClick={onReanalyze}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
        >
          Reanalyze
        </button>
      </div>
      <p className="text-gray-600">This will be our analysis table view</p>
    </div>
  )
} 