import React from "react"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs"
import { getPromptOptions } from "../lib/models"

export default function PromptSelect(props: {
  handlePromptChange: (value: string) => void
  model: string
  disabled: boolean
}) {
  const options = getPromptOptions(props.model)

  return (
    <Tabs defaultValue="Auto" onValueChange={props.handlePromptChange}>
      <TabsList>
        {options.map((prompt, index) => (
          <TabsTrigger disabled={props.disabled} key={index} value={prompt.value}>
            {prompt.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
