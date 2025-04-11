'use client'

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow, Popover, PopoverContent, PopoverTrigger, Card, CardBody, CardHeader } from "@nextui-org/react"
import { PHASES, getCurrentPhase, getDaysUntilNextPhase, formatDate } from "@/lib/rune-phase-utils"
import { useEffect, useState } from "react"

export function RunesPhaseDisplay() {
  const [currentPhase, setCurrentPhase] = useState(getCurrentPhase())
  const [daysUntilNext, setDaysUntilNext] = useState(getDaysUntilNextPhase())
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhase(getCurrentPhase())
      setDaysUntilNext(getDaysUntilNextPhase())
    }, 1000 * 60 * 60) // Update every hour
    
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Phase Header */}
      <Card className="bg-black text-white">
        <CardHeader className="p-4 flex flex-row justify-between items-center">
          <div className="text-lg">
            Phase: {currentPhase?.phase} ({currentPhase?.characters} ~ 26 Charsets)
          </div>
          <Popover>
            <PopoverTrigger>
              <div className="text-lg cursor-pointer hover:text-orange-400 transition-colors">
                Next Phase: {daysUntilNext} Days
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Card className="w-[600px] max-h-[400px] overflow-auto">
                <CardHeader className="p-4 sticky top-0 bg-white z-10">
                  <h2 className="text-xl font-semibold">Details of Etching Phase</h2>
                </CardHeader>
                <CardBody>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableColumn>Phase</TableColumn>
                        <TableColumn>Available Characters</TableColumn>
                        <TableColumn>Date</TableColumn>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {PHASES.map((phase) => (
                        <TableRow 
                          key={phase.phase}
                          className={currentPhase?.phase === phase.phase ? 'bg-orange-100 dark:bg-orange-900' : ''}
                        >
                          <TableCell>{phase.phase}</TableCell>
                          <TableCell>
                            {phase.characters} {Array(phase.characters).fill('Z').join('')}
                          </TableCell>
                          <TableCell className={currentPhase?.phase === phase.phase ? 'text-orange-600 dark:text-orange-400' : ''}>
                            {formatDate(phase.startDate)} ~ {formatDate(phase.endDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </PopoverContent>
          </Popover>
        </CardHeader>
      </Card>
    </div>
  )
}

