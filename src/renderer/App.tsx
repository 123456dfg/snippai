import "./App.css"
import React, { useEffect, useRef, useState } from "react"
import AIModel from "./models"
// eslint-disable-next-line
import logo from "./assets/logo.png"
import DisplayTextResult from "./components/displayTextResult"
import LoadingSkeleton from "./components/loadingSkeleton"
import { Badge } from "./components/ui/badge"
import ModelSelect from "./components/modelSelect"
import SettingsDialog from "./components/apiKeyInput"
import PromptSelect from "./components/promptSelect"
import { RotateCw, Settings2, Trash2 } from "lucide-react"
import { Button } from "./components/ui/button"
import {
  findModelByValue,
  getAllModels,
  getModelApiKey,
  getPromptOptions,
  resolveApiUrlForModel,
  type ManagedModel,
} from "./lib/models"
import {
  getDefaultSearchClient,
  getSearchClientApiKey,
  loadSearchClients,
  type SearchClient,
} from "./lib/searchClients"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip"
import { useToast } from "./components/ui/use-toast"
import { Toaster } from "./components/ui/toaster"
import { MathJaxContext } from "better-react-mathjax"
import DisplayLatex from "./components/displayLatex"
import { createWebSearchProvider } from "./web-search/factory"
import type { AIModelTool } from "./models/types"

declare global {
  interface ElectronAPI {
    onScreenShotRes: (callback: (value: string) => void) => void
    removeListener: (channel: string, func: (...args: unknown[]) => void) => void
    removeAllListeners: (channel: string) => void
  }

  interface Window {
    electronAPI?: ElectronAPI
  }
}

function getInitialModels(): ManagedModel[] {
  return getAllModels()
}

function getInitialSelectedModel(models: ManagedModel[]): string {
  const fallbackModel = models[0]?.value ?? ""
  const stored = localStorage.getItem("model")
  if (!stored) {
    return fallbackModel
  }
  if (models.find((item) => item.value === stored)) {
    return stored
  }
  return fallbackModel
}

function getInitialSearchClients(): SearchClient[] {
  return loadSearchClients()
}

const WEB_SEARCH_TOOLS: AIModelTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search web for solving the user's question from screenshot context.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query in natural language",
          },
        },
        required: ["query"],
      },
    },
  },
]

const WEB_SEARCH_VALIDATION_INSTRUCTION = `
Use the web_search tool ONLY when necessary.

Call web_search if and only if:
- The question involves real-time, recent, or rapidly changing information (e.g. news, prices, APIs, versions)
- The answer depends on specific factual data you are not confident about (e.g. exact dates, statistics, authorship)
- The question explicitly asks for verification, sources, or up-to-date information

Do NOT call web_search if:
- The question is about general knowledge, reasoning, coding, or well-known facts
- You can answer confidently from your internal knowledge
- The question is subjective, conceptual, or does not require external validation

Constraints:
- At most one web_search call per question unless absolutely necessary
- If you call web_search, use it to verify key facts, not to restate the entire answer

Always decide first: "Do I really need external verification?"
If not, answer directly.
`;

function App() {
  const [screenShotResult, setScreenShotResult] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [onError, setOnError] = useState(false)
  const [modelList, setModelList] = useState<ManagedModel[]>(() => getInitialModels())
  const [model, setModel] = useState<string>(() => getInitialSelectedModel(getInitialModels()))
  const [searchClients, setSearchClients] = useState<SearchClient[]>(() => getInitialSearchClients())
  const [openDialog, setOpenDialog] = useState(false)
  const [prompt, setPrompt] = useState("Auto")
  const [solveWebSearchEnabled, setSolveWebSearchEnabled] = useState<boolean>(() => {
    return localStorage.getItem("solve_web_search_enabled") === "1"
  })
  const worker = useRef<Worker | null>(null)

  const { toast } = useToast()

  const config = {
    loader: { load: ["[tex]/html"] },
    tex: {
      packages: { "[+]": ["html"] },
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"],
      ],
      displayMath: [
        ["$$", "$$"],
        ["\\[", "\\]"],
        ["```latex", "```"],
      ],
    },
  }

  useEffect(() => {
    localStorage.setItem("model", model)
  }, [model])

  useEffect(() => {
    localStorage.setItem("solve_web_search_enabled", solveWebSearchEnabled ? "1" : "0")
  }, [solveWebSearchEnabled])

  const handleModelsChanged = (nextModelList: ManagedModel[]) => {
    setModelList(nextModelList)
    if (!nextModelList.find((item) => item.value === model)) {
      const fallback = nextModelList[0]?.value ?? "gemini"
      setModel(fallback)
      localStorage.setItem("model", fallback)
    }
  }

  const handleModelChange = (value: string) => {
    if (!value || value === model) {
      return
    }
    setModel(value)
  }

  const runSolveWithWebSearch = async (
    modelInstance: AIModel,
    base64Image: string,
    fullPrompt: string,
    selectedModel: ManagedModel,
    modelApiKey: string
  ): Promise<string> => {
    const defaultSearchClient = getDefaultSearchClient(searchClients)
    if (!defaultSearchClient) {
      throw new Error("Add a search client in Settings > Web Search and set it as the default first.")
    }

    const searchApiKey = await getSearchClientApiKey(defaultSearchClient.id)
    if (!searchApiKey) {
      throw new Error("The default search client is missing an API key. Please add it again in Settings.")
    }

    const promptWithWebSearchInstruction = `${fullPrompt}\n\n${WEB_SEARCH_VALIDATION_INSTRUCTION}`

    const searchProvider = createWebSearchProvider(defaultSearchClient.provider, searchApiKey)
    const firstResponse = await modelInstance.run(
      base64Image,
      promptWithWebSearchInstruction,
      modelApiKey,
      resolveApiUrlForModel(selectedModel),
      selectedModel.modelName,
      WEB_SEARCH_TOOLS
    )

    if (!firstResponse.toolCalls.length) {
      if (!firstResponse.content) {
        throw new Error("The model did not return a valid result.")
      }
      return firstResponse.content
    }

    const searchResults: string[] = []
    for (const toolCall of firstResponse.toolCalls) {
      if (toolCall.name !== "web_search") {
        continue
      }
      let query = ""
      try {
        const parsed = JSON.parse(toolCall.arguments) as { query?: string }
        if (typeof parsed.query === "string") {
          query = parsed.query.trim()
        }
      } catch {
        query = ""
      }
      if (!query) {
        continue
      }
      const resultText = await searchProvider.search(query)
      searchResults.push(resultText)
    }

    if (!searchResults.length) {
      if (firstResponse.content) {
        return firstResponse.content
      }
      throw new Error("The model did not generate a usable web search query.")
    }

    const secondPrompt = `${fullPrompt}\n\nThe following are results returned by the web_search tool. Use them to verify your reasoning and provide the final answer:\n${searchResults.join("\n\n")}`
    const secondResponse = await modelInstance.run(
      base64Image,
      secondPrompt,
      modelApiKey,
      resolveApiUrlForModel(selectedModel),
      selectedModel.modelName
    )

    if (secondResponse.content) {
      return secondResponse.content
    }
    if (firstResponse.content) {
      return firstResponse.content
    }
    throw new Error("The model did not return a final result.")
  }

  const handleTextChange = (text: string) => {
    setResult(text)
  }

  const recognizeScreenshot = async (base64Image: string) => {
    setResult(null)
    setOnError(false)

    if (modelList.length === 0) {
      setOpenDialog(true)
      toast({
        title: "No Models Configured",
        description: "Please add a model in Settings before using screenshot recognition.",
      })
      return
    }

    setLoading(true)
    try {
      const selectedModel = findModelByValue(model, modelList)
      if (!selectedModel) {
        throw new Error("Could not find the currently selected model.")
      }

      const promptList = getPromptOptions(selectedModel.value)
      const fullPrompt = promptList.find((item) => item.value === prompt)?.prompt ?? promptList[0].prompt
      const apiKey = await getModelApiKey(selectedModel.value, modelList)

      if (selectedModel.requireApiKey && !apiKey) {
        setOpenDialog(true)
        throw new Error(`Model ${selectedModel.label} requires an API key in Settings before it can be used.`)
      }

      const modelInstance = await AIModel.create(selectedModel.value)
      if (prompt === "Solve" && solveWebSearchEnabled) {
        const solveResult = await runSolveWithWebSearch(
          modelInstance,
          base64Image,
          fullPrompt,
          selectedModel,
          apiKey
        )
        setResult(solveResult)
      } else {
        const response = await modelInstance.run(
          base64Image,
          fullPrompt,
          apiKey,
          resolveApiUrlForModel(selectedModel),
          selectedModel.modelName
        )
        setResult(response.content)
      }
    } catch (error) {
      setOnError(true)
      toast({
        title: "Model Request Failed",
        description: (error as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePromptChange = (value: string) => {
    setPrompt(value)
  }

  useEffect(() => {
    if (screenShotResult !== null) {
      recognizeScreenshot(screenShotResult)
    }
  }, [prompt, screenShotResult])

  useEffect(() => {
    const handler = (value: string) => {
      setScreenShotResult(value)
    }

    if (!worker.current) {
      worker.current = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      })
    }

    if (window.electronAPI) {
      window.electronAPI.onScreenShotRes(handler)
      return () => {
        window.electronAPI.removeAllListeners("screenshot-result")
      }
    }
    return undefined
  }, [])

  const platform = window.navigator.platform
  let shortcut = "Ctrl + Shift + A"
  if (platform === "MacIntel") {
    shortcut = "Command + Shift + A"
  }

  return (
    <div className="App dark select-none">
      <header className="App-header relative">
        <div className="flex h-8 w-full shrink-0 px-4 md:px-6 absolute top-[0.5rem] right-0">
          <div className="hidden sm:flex">
            <span className="sr-only">Snippai</span>
          </div>
          <div className="ml-auto space-x-2 flex text-white select-none">
            <ModelSelect handleModelChange={handleModelChange} modelList={modelList} value={model} />
            <SettingsButton onClick={() => setOpenDialog(true)} />
          </div>
        </div>

        {!screenShotResult && <img src={logo} className="App-logo select-none" alt="logo" />}
        {!screenShotResult && (
          <p className="mb-2 select-none">
            Press <code>{shortcut}</code> to make a screenshot.
          </p>
        )}

        {screenShotResult && (
          <div className="pt-[2.5rem]">
            <Badge variant="secondary" className="mb-2 antialiased font-medium">
              <ImageIcon className="w-5 h-5 mr-1" />
              Screenshot
            </Badge>
          </div>
        )}

        <div className="max-w-[90%]">
          {screenShotResult && (
            <img
              src={`data:image/png;base64,${screenShotResult}`}
              alt="screenshot"
              className="mb-2 rounded-lg object-center border border-gray-100 dark:border-gray-800 mx-auto"
            />
          )}

          <div className="flex space-x-2 mb-2 justify-center">
            <PromptSelect handlePromptChange={handlePromptChange} model={model} disabled={loading} />
            {prompt === "Solve" && (
              <Button
                variant={solveWebSearchEnabled ? "default" : "outline"}
                onClick={() => {
                  if (!solveWebSearchEnabled && searchClients.length === 0) {
                    setOpenDialog(true)
                    toast({
                      title: "No Search Client",
                      description: "Please add a search client in Settings > Web Search first.",
                    })
                    return
                  }
                  setSolveWebSearchEnabled((value) => !value)
                }}
              >
                Web Search: {solveWebSearchEnabled ? "On" : "Off"}
              </Button>
            )}
            {(result || onError) && screenShotResult && (
              <RetryButton onClick={() => recognizeScreenshot(screenShotResult)} />
            )}
            {result && (
              <TrashButton
                onClick={() => {
                  setScreenShotResult(null)
                  setResult(null)
                  setOnError(false)
                }}
              />
            )}
          </div>

          {loading && <LoadingSkeleton />}

          <MathJaxContext version={3} config={config}>
            {result && prompt === "Formula" && <DisplayLatex latex={result} />}
          </MathJaxContext>
          {result && <DisplayTextResult text={result} onTextChange={handleTextChange} />}
        </div>
      </header>

      <SettingsDialog
        model={model}
        modelList={modelList}
        open={openDialog}
        onOpenChange={setOpenDialog}
        onModelsChanged={handleModelsChanged}
        searchClients={searchClients}
        onSearchClientsChanged={setSearchClients}
      />
      <Toaster />
    </div>
  )
}

function ImageIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  )
}

function SettingsButton(props: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="mt-auto" onClick={props.onClick}>
            <Settings2 className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function RetryButton(props: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="mt-auto" variant="secondary" size="icon" onClick={props.onClick}>
            <RotateCw className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Retry</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function TrashButton(props: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="mt-auto" variant="destructive" size="icon" onClick={props.onClick}>
            <Trash2 className="h-10 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear Screenshot</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default App
