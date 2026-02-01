"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mic, MicOff, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function VoicePage() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")

  const voiceCommands = [
    { phrase: "show zone *", description: "Navigate to specific warehouse zone", example: "show zone A" },
    { phrase: "locate product *", description: "Find product location", example: "locate product ABC123" },
    { phrase: "run accuracy audit", description: "Start accuracy check", example: "run accuracy audit" },
    { phrase: "what is the accuracy", description: "Get current accuracy percentage", example: "what is the accuracy" },
    { phrase: "enable autopilot", description: "Activate autopilot mode", example: "enable autopilot" },
    { phrase: "disable autopilot", description: "Deactivate autopilot mode", example: "disable autopilot" },
  ]

  const toggleListening = () => {
    setIsListening(!isListening)
    if (!isListening) {
      setTranscript("Listening...")
    } else {
      setTranscript("")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
      {/* Header */}
      <div className="command-center-gradient text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20">
              <Link href="/command-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Voice Control</h1>
                <p className="text-white/90 text-sm">Voice-activated command interface</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Voice Input Card */}
        <Card className="command-center-card mb-8">
          <CardHeader>
            <CardTitle>Voice Commands</CardTitle>
            <CardDescription>
              Click the microphone to start voice control
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <button
                onClick={toggleListening}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isListening
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 voice-listening'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-110'
                } shadow-2xl`}
              >
                {isListening ? (
                  <MicOff className="h-16 w-16 text-white" />
                ) : (
                  <Mic className="h-16 w-16 text-white" />
                )}
              </button>
            </div>

            <div className="min-h-[60px] mb-4">
              {isListening && (
                <div className="flex items-center justify-center gap-2">
                  <Volume2 className="h-5 w-5 text-purple-600 animate-pulse" />
                  <span className="text-lg text-purple-600 font-medium">{transcript}</span>
                </div>
              )}
              {!isListening && transcript && (
                <p className="text-gray-600">{transcript}</p>
              )}
            </div>

            <Badge className="command-center-badge">
              {isListening ? 'Listening...' : 'Ready'}
            </Badge>
          </CardContent>
        </Card>

        {/* Available Commands */}
        <Card className="command-center-card">
          <CardHeader>
            <CardTitle>Available Voice Commands</CardTitle>
            <CardDescription>
              Say any of these commands to control the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {voiceCommands.map((cmd, index) => (
                <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-3">
                    <Volume2 className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-mono text-purple-900 font-semibold">"{cmd.phrase}"</p>
                      <p className="text-sm text-gray-600 mt-1">{cmd.description}</p>
                      <p className="text-xs text-gray-500 mt-1">Example: "{cmd.example}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
