"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Clock } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AppPreview() {
  const [progress, setProgress] = useState(30)
  const [minutes, setMinutes] = useState(46)

  // Animate the timer for effect
  useEffect(() => {
    const timer = setInterval(() => {
      setMinutes((prev) => (prev === 59 ? 0 : prev + 1))
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-blue-600 rounded-full blur-3xl opacity-20 transform -translate-x-1/4 translate-y-1/4"></div>

      <div className="relative z-10 bg-blue-600 rounded-[40px] p-8 transform rotate-3 shadow-xl">
        <div className="flex flex-col gap-4 max-w-[320px]">
          {/* Hours tracking card */}
          <div className="bg-white rounded-3xl p-5 shadow-lg transform -rotate-3">
            <div className="mb-4">
              <h3 className="text-lg font-bold">Working hours</h3>
            </div>

            <div className="relative h-40 w-40 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-blue-100"></div>
              <svg className="absolute inset-0" width="160" height="160" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeDasharray={`${progress * 4.4} ${440 - progress * 4.4}`}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xs text-gray-500">Hours Completed</div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-blue-600">{progress}</span>
                  <span className="text-sm text-gray-500 ml-1">/ 120</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <div className="text-center">
                <div className="font-semibold">120</div>
                <div className="text-xs text-gray-500">Required</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{progress}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </div>

          {/* Time duration card */}
          <div className="bg-white rounded-3xl p-5 shadow-lg transform -rotate-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-medium">Time Duration</h3>
            </div>
            <div className="text-3xl font-bold">
              1<span className="text-xl">h</span> {minutes}
              <span className="text-xl">m</span>
            </div>
          </div>

          {/* Messages card */}
          <div className="bg-white rounded-3xl p-5 shadow-lg transform -rotate-3">
            <div className="mb-3">
              <h3 className="text-lg font-bold">Messages</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Samuel" />
                  <AvatarFallback>SZ</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Samuel Zamir</div>
                  <div className="text-xs text-gray-500">Samuel is typing...</div>
                </div>
                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
              </div>

              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Dwayne" />
                  <AvatarFallback>DF</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Dwayne Filli</div>
                  <div className="text-xs text-gray-500">Hey, how have...</div>
                </div>
                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
              </div>

              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Jenna" />
                  <AvatarFallback>JL</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Jenna Lac</div>
                  <div className="text-xs text-gray-500">Great! I'll...</div>
                </div>
                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Task completed card */}
          <div className="bg-white rounded-3xl p-5 shadow-lg transform -rotate-3">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="text-sm font-medium">Task Completed</h3>
            </div>
            <div className="text-3xl font-bold">12</div>
          </div>

          {/* Event card */}
          <div className="bg-white rounded-3xl p-5 shadow-lg transform -rotate-3">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium">International Band Music</h3>
                <p className="text-xs text-gray-500">Concert 22</p>
              </div>
            </div>
            <div className="flex justify-between mt-3">
              <div className="text-xs bg-gray-100 px-2 py-1 rounded">9:00 PM</div>
              <div className="text-xs bg-gray-100 px-2 py-1 rounded">Campus Hall</div>
            </div>
            <button className="w-full mt-3 bg-blue-600 text-white text-sm py-1.5 rounded-md">Attending</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Calendar(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}
