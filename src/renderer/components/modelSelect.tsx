"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "../components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"
import { type ManagedModel } from "../lib/models"

export default function SelectModel(props: {
  handleModelChange: (value: string) => void
  value: string
  modelList: ManagedModel[]
}) {
  const [open, setOpen] = React.useState(false)

  const isEmpty = props.modelList.length === 0
  const selectedLabel = isEmpty
    ? "No models"
    : (props.modelList.find((item) => item.value === props.value)?.label ?? "")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isEmpty}
          className="w-[240px] justify-between"
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 dark">
        <Command>
          <CommandInput placeholder="Search model..." />
          <CommandEmpty>No model found.</CommandEmpty>
          <CommandGroup>
            {props.modelList.map((model) => (
              <CommandItem
                key={model.value}
                value={model.value}
                onSelect={(currentValue) => {
                  props.handleModelChange(currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    props.value === model.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {model.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
