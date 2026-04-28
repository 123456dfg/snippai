import React, { useEffect, useState } from "react"
import { Pencil, Trash2, Zap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import { Switch } from "../components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import {
  CUSTOM_PROVIDER_VALUE,
  getAllModels,
  getModelApiKey,
  inferApiStyleFromUrl,
  MODEL_PROVIDERS,
  saveCustomModels,
  saveModelApiKey,
  type ManagedModel,
} from "../lib/models"
import { encryptText } from "../lib/secureStorage"
import {
  getSearchClientApiKey,
  replaceSearchClients,
  type SearchClient,
  type SearchProvider,
} from "../lib/searchClients"
import OpenAIStyleModel from "../models/openai-style"
import GeminiStyleModel from "../models/gemini-style"
import AnthropicStyleModel from "../models/anthropic-style"
import { useToast } from "../components/ui/use-toast"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (value: boolean) => void
  model: string
  modelList: ManagedModel[]
  onModelsChanged: (modelList: ManagedModel[]) => void
  searchClients: SearchClient[]
  onSearchClientsChanged: (clients: SearchClient[]) => void
}

interface SearchClientDraft {
  id: string
  provider: SearchProvider
  isDefault: boolean
}

function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ""
  }
  return trimmed.replace(/\/+$/, "")
}

function ensureSingleDefaultSearchClient(clients: SearchClientDraft[]): SearchClientDraft[] {
  if (clients.length === 0) {
    return clients
  }

  const defaultIndex = clients.findIndex((item) => item.isDefault)
  if (defaultIndex < 0) {
    return clients.map((item, index) => ({
      ...item,
      isDefault: index === 0,
    }))
  }

  return clients.map((item, index) => ({
    ...item,
    isDefault: index === defaultIndex,
  }))
}

export default function SettingsDialog(props: SettingsDialogProps) {
  const [savingSettings, setSavingSettings] = useState(false)

  const [addModelOpen, setAddModelOpen] = useState(false)
  const [addingModel, setAddingModel] = useState(false)
  const [editingModelValue, setEditingModelValue] = useState<string | null>(null)

  const [addSearchClientOpen, setAddSearchClientOpen] = useState(false)
  const [savingSearchClient, setSavingSearchClient] = useState(false)
  const [editingSearchClientId, setEditingSearchClientId] = useState<string | null>(null)

  type DeleteTarget =
    | { type: "model"; value: string; label: string }
    | { type: "searchClient"; id: string; label: string }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [testingModelValue, setTestingModelValue] = useState<string | null>(null)
  const { toast } = useToast()

  const [alias, setAlias] = useState("")
  const [provider, setProvider] = useState(MODEL_PROVIDERS[0].value)
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [modelName, setModelName] = useState("")

  const [searchProvider, setSearchProvider] = useState<SearchProvider>("tavily")
  const [searchApiKey, setSearchApiKey] = useState("")

  const [draftModelList, setDraftModelList] = useState<ManagedModel[]>(props.modelList)
  const [draftModelApiKeyMap, setDraftModelApiKeyMap] = useState<Record<string, string>>({})
  const [draftSearchClients, setDraftSearchClients] = useState<SearchClientDraft[]>([])
  const [draftSearchApiKeyMap, setDraftSearchApiKeyMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    const loadDrafts = async () => {
      if (!props.open) {
        return
      }

      const nextModelList = props.modelList.map((item) => ({ ...item }))
      const modelApiPairs = await Promise.all(
        nextModelList.map(async (item) => {
          const key = await getModelApiKey(item.value, props.modelList)
          return [item.value, key] as const
        })
      )

      const nextSearchClients: SearchClientDraft[] = props.searchClients.map((item) => ({
        id: item.id,
        provider: item.provider,
        isDefault: item.isDefault,
      }))
      const searchApiPairs = await Promise.all(
        props.searchClients.map(async (item) => {
          const key = await getSearchClientApiKey(item.id)
          return [item.id, key] as const
        })
      )

      if (!active) {
        return
      }

      setDraftModelList(nextModelList)
      setDraftModelApiKeyMap(Object.fromEntries(modelApiPairs))
      setDraftSearchClients(nextSearchClients)
      setDraftSearchApiKeyMap(Object.fromEntries(searchApiPairs))

      resetForm()
      resetSearchForm()
      setAddModelOpen(false)
      setAddSearchClientOpen(false)
    }

    void loadDrafts()

    return () => {
      active = false
    }
  }, [props.open, props.modelList, props.searchClients])

  const handleDialogOpenChange = (value: boolean) => {
    if (!value) {
      resetForm()
      resetSearchForm()
      setAddModelOpen(false)
      setAddSearchClientOpen(false)
    }
    props.onOpenChange(value)
  }

  const resetForm = () => {
    setEditingModelValue(null)
    setAlias("")
    setProvider(MODEL_PROVIDERS[0].value)
    setApiKey("")
    setApiUrl("")
    setModelName("")
  }

  const openCreateDialog = () => {
    resetForm()
    setAddModelOpen(true)
  }

  const openEditDialog = (item: ManagedModel) => {
    if (!item.isCustom) {
      return
    }

    setEditingModelValue(item.value)
    setAlias(item.label)
    setProvider(item.provider)
    setModelName(item.modelName)
    const isCustomProvider =
      item.provider === CUSTOM_PROVIDER_VALUE ||
      !MODEL_PROVIDERS.some((providerItem) => providerItem.value === item.provider)
    setApiUrl(isCustomProvider ? item.apiUrl : "")
    setApiKey(draftModelApiKeyMap[item.value] ?? "")
    setAddModelOpen(true)
  }

  const removeModel = (item: ManagedModel) => {
    if (!item.isCustom) {
      return
    }
    setDeleteTarget({ type: "model", value: item.value, label: item.label })
  }

  const testModelConnection = async (item: ManagedModel) => {
    const apiKey = draftModelApiKeyMap[item.value]?.trim() ?? ""
    if (item.requireApiKey && !apiKey) {
      toast({ title: "Test Failed", description: "Please enter an API key first." })
      return
    }

    setTestingModelValue(item.value)
    try {
      if (item.modelScript === "gemini") {
        const client = new GeminiStyleModel()
        await client.testConnection(apiKey, item.modelName, item.apiUrl)
      } else if (item.modelScript === "anthropic") {
        const client = new AnthropicStyleModel()
        await client.testConnection(apiKey, item.modelName, item.apiUrl)
      } else {
        const client = new OpenAIStyleModel()
        await client.testConnection(apiKey, item.modelName, item.apiUrl)
      }
      toast({ title: "Connection Successful", description: `${item.label} is reachable.` })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setTestingModelValue(null)
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }

    if (deleteTarget.type === "model") {
      setDraftModelList((prev) => prev.filter((item) => item.value !== deleteTarget.value))
      setDraftModelApiKeyMap((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.value]
        return next
      })
    } else {
      setDraftSearchClients((prev) =>
        ensureSingleDefaultSearchClient(prev.filter((item) => item.id !== deleteTarget.id))
      )
      setDraftSearchApiKeyMap((prev) => {
        const next = { ...prev }
        delete next[deleteTarget.id]
        return next
      })
    }

    setDeleteTarget(null)
  }

  const submitModel = async () => {
    setAddingModel(true)
    try {
      const trimmedAlias = alias.trim()
      const trimmedModelName = modelName.trim()
      const trimmedApiKey = apiKey.trim()
      if (!trimmedAlias || !trimmedModelName || !trimmedApiKey) {
        throw new Error("Please provide a model alias, API key, and model name.")
      }

      const selectedProvider = MODEL_PROVIDERS.find((item) => item.value === provider)
      const isCustomProvider = provider === CUSTOM_PROVIDER_VALUE || !selectedProvider
      const resolvedApiUrl = isCustomProvider
        ? normalizeApiUrl(apiUrl)
        : normalizeApiUrl(selectedProvider.apiUrl)

      if (!resolvedApiUrl) {
        throw new Error("Please enter a valid model API URL.")
      }

      const modelValue =
        editingModelValue ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      const nextCustomModel: ManagedModel = {
        value: modelValue,
        label: trimmedAlias,
        provider,
        providerLabel: selectedProvider?.label ?? "Custom",
        requireApiKey: true,
        requireBaseURL: false,
        modelScript: isCustomProvider
          ? inferApiStyleFromUrl(resolvedApiUrl)
          : selectedProvider.apiStyle,
        modelName: trimmedModelName,
        apiUrl: resolvedApiUrl,
        isCustom: true,
        encryptedApiKey: "",
      }

      setDraftModelList((prev) => {
        if (editingModelValue) {
          return prev.map((item) => (item.value === editingModelValue ? nextCustomModel : item))
        }
        return [...prev, nextCustomModel]
      })
      setDraftModelApiKeyMap((prev) => ({
        ...prev,
        [modelValue]: trimmedApiKey,
      }))

      setAddModelOpen(false)
      resetForm()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setAddingModel(false)
    }
  }

  const resetSearchForm = () => {
    setEditingSearchClientId(null)
    setSearchProvider("tavily")
    setSearchApiKey("")
  }

  const openCreateSearchClientDialog = () => {
    resetSearchForm()
    setAddSearchClientOpen(true)
  }

  const openEditSearchClientDialog = (item: SearchClientDraft) => {
    setEditingSearchClientId(item.id)
    setSearchProvider(item.provider)
    setSearchApiKey(draftSearchApiKeyMap[item.id] ?? "")
    setAddSearchClientOpen(true)
  }

  const removeSearchClient = (item: SearchClientDraft) => {
    setDeleteTarget({ type: "searchClient", id: item.id, label: item.provider.toUpperCase() })
  }

  const submitSearchClient = async () => {
    setSavingSearchClient(true)
    try {
      const trimmedApiKey = searchApiKey.trim()
      if (!trimmedApiKey) {
        throw new Error("Please enter a search client API key.")
      }

      const clientId =
        editingSearchClientId ?? `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      setDraftSearchClients((prev) => {
        const nextDraft = editingSearchClientId
          ? prev.map((item) =>
              item.id === editingSearchClientId
                ? {
                    ...item,
                    provider: searchProvider,
                  }
                : item
            )
          : [
              ...prev,
              {
                id: clientId,
                provider: searchProvider,
                isDefault: false,
              },
            ]

        return ensureSingleDefaultSearchClient(nextDraft)
      })

      setDraftSearchApiKeyMap((prev) => ({
        ...prev,
        [clientId]: trimmedApiKey,
      }))

      setAddSearchClientOpen(false)
      resetSearchForm()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSavingSearchClient(false)
    }
  }

  const saveAllChanges = async () => {
    setSavingSettings(true)
    try {
      const customModels = draftModelList.filter((item) => item.isCustom)
      const encryptedCustomModels = await Promise.all(
        customModels.map(async (item) => ({
          ...item,
          encryptedApiKey: await encryptText((draftModelApiKeyMap[item.value] ?? "").trim()),
        }))
      )

      saveCustomModels(encryptedCustomModels)

      const allModelsAfterCustomSaved = getAllModels()
      const builtinModels = allModelsAfterCustomSaved.filter((item) => !item.isCustom)
      for (const item of builtinModels) {
        await saveModelApiKey(item.value, draftModelApiKeyMap[item.value] ?? "", allModelsAfterCustomSaved)
      }

      const nextModelList = getAllModels()
      props.onModelsChanged(nextModelList)

      const encryptedSearchClients = await Promise.all(
        draftSearchClients.map(async (item) => {
          const key = (draftSearchApiKeyMap[item.id] ?? "").trim()
          if (!key) {
            throw new Error(`Search client ${item.provider.toUpperCase()} is missing an API key.`)
          }
          return {
            ...item,
            encryptedApiKey: await encryptText(key),
          }
        })
      )

      const nextSearchClients = replaceSearchClients(encryptedSearchClients)
      props.onSearchClientsChanged(nextSearchClients)

      props.onOpenChange(false)
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSavingSettings(false)
    }
  }

  const discardAllChanges = () => {
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage API keys and available models.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="models">
          <TabsList>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="web-search">Web Search</TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="mt-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-input p-3">
              <p className="text-sm text-muted-foreground">
                Note: The model must support image multimodality to work correctly.
              </p>
              <Button onClick={openCreateDialog}>Add Model</Button>
            </div>

            <div className="mt-4 max-h-[45vh] space-y-3 overflow-y-auto pr-2">
              {draftModelList.map((item) => (
                <div
                  key={item.value}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-input p-3"
                >
                  <span className="font-medium">{item.label}</span>
                  <Badge variant="secondary">{item.providerLabel}</Badge>
                  <Badge variant="outline">{item.modelScript}</Badge>
                  <span className="text-xs text-muted-foreground">model: {item.modelName}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testModelConnection(item)}
                      disabled={testingModelValue === item.value}
                      className="h-8"
                    >
                      <Zap className="mr-1 h-3.5 w-3.5" />
                      {testingModelValue === item.value ? "Testing..." : "Test"}
                    </Button>
                    {item.isCustom && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-8"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeModel(item)}
                          className="h-8"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="web-search" className="mt-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-input p-3">
              <p className="text-sm text-muted-foreground">Manage web search clients. Tavily is currently supported.</p>
              <Button onClick={openCreateSearchClientDialog}>Add Search Client</Button>
            </div>

            <div className="mt-4 space-y-3">
              {draftSearchClients.length === 0 && (
                <div className="rounded-md border border-input p-3 text-sm text-muted-foreground">
                  No search clients yet. Add one first.
                </div>
              )}
              {draftSearchClients.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-md border border-input p-3">
                  <span className="font-medium">{item.provider.toUpperCase()}</span>
                  <Badge variant="secondary">Search Client</Badge>
                  <div className="ml-auto flex items-center gap-3">
                    <Label htmlFor={`default-${item.id}`} className="text-xs text-muted-foreground cursor-pointer">
                      Default
                    </Label>
                    <Switch
                      id={`default-${item.id}`}
                      checked={item.isDefault}
                      onCheckedChange={(checked) => {
                        setDraftSearchClients((prev) =>
                          ensureSingleDefaultSearchClient(
                            prev.map((client) => ({
                              ...client,
                              isDefault: checked ? client.id === item.id : client.isDefault,
                            }))
                          )
                        )
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditSearchClientDialog(item)}
                      className="h-8"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSearchClient(item)}
                      className="h-8"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={discardAllChanges} disabled={savingSettings}>
            Discard Changes
          </Button>
          <Button onClick={saveAllChanges} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>

        <Dialog
          open={addModelOpen}
          onOpenChange={(value) => {
            setAddModelOpen(value)
            if (!value) {
              resetForm()
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModelValue ? "Edit Model" : "Add Model"}</DialogTitle>
              <DialogDescription>
                Model details are saved to the current draft. Click "Save Changes" at the bottom of Settings to apply them.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="model-alias">Model Alias</Label>
                <Input
                  id="model-alias"
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder="For example: My DeepSeek-V3"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-provider">Model Provider</Label>
                <select
                  id="model-provider"
                  value={provider}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => setProvider(event.target.value)}
                >
                  {MODEL_PROVIDERS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-api-key">API Key</Label>
                <Input
                  id="model-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Enter the provider API key"
                />
              </div>

              {provider === CUSTOM_PROVIDER_VALUE && (
                <div className="grid gap-2">
                  <Label htmlFor="model-api-url">Model API URL</Label>
                  <Input
                    id="model-api-url"
                    value={apiUrl}
                    onChange={(event) => setApiUrl(event.target.value)}
                    placeholder="For example: https://example.com/v1"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="model-name">Model Name</Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                  placeholder="For example: deepseek-chat / gpt-4o / gemini-1.5-pro"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddModelOpen(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button disabled={addingModel} onClick={submitModel}>
                {addingModel ? "Processing..." : editingModelValue ? "Save Changes" : "Add Model"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={addSearchClientOpen}
          onOpenChange={(value) => {
            setAddSearchClientOpen(value)
            if (!value) {
              resetSearchForm()
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSearchClientId ? "Edit Search Client" : "Add Search Client"}</DialogTitle>
              <DialogDescription>
                The API key is saved to the current draft. Click "Save Changes" at the bottom of Settings to apply it.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="search-provider">Provider</Label>
                <select
                  id="search-provider"
                  value={searchProvider}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  onChange={(event) => setSearchProvider(event.target.value as SearchProvider)}
                >
                  <option value="tavily">Tavily</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="search-api-key">API Key</Label>
                <Input
                  id="search-api-key"
                  type="password"
                  value={searchApiKey}
                  onChange={(event) => setSearchApiKey(event.target.value)}
                  placeholder="Enter the Tavily API key"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddSearchClientOpen(false)
                  resetSearchForm()
                }}
              >
                Cancel
              </Button>
              <Button disabled={savingSearchClient} onClick={submitSearchClient}>
                {savingSearchClient ? "Processing..." : editingSearchClientId ? "Save Changes" : "Add Search Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deleteTarget?.type === "model" ? "Model" : "Search Client"}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{deleteTarget?.label}&rdquo;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
