import React, { useCallback, useEffect, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Label } from "../components/ui/label"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import {
  addCustomModel,
  CUSTOM_PROVIDER_VALUE,
  deleteCustomModel,
  getModelApiKey,
  MODEL_PROVIDERS,
  saveModelApiKey,
  updateCustomModel,
  type ManagedModel,
} from "../lib/models"
import {
  addSearchClient,
  deleteSearchClient,
  getSearchClientApiKey,
  updateSearchClient,
  type SearchClient,
  type SearchProvider,
} from "../lib/searchClients"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (value: boolean) => void
  model: string
  modelList: ManagedModel[]
  onModelsChanged: (modelList: ManagedModel[]) => void
  searchClients: SearchClient[]
  onSearchClientsChanged: (clients: SearchClient[]) => void
}

export default function SettingsDialog(props: SettingsDialogProps) {
  const [currentApiKey, setCurrentApiKey] = useState("")
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [addModelOpen, setAddModelOpen] = useState(false)
  const [addingModel, setAddingModel] = useState(false)
  const [editingModelValue, setEditingModelValue] = useState<string | null>(null)
  const [addSearchClientOpen, setAddSearchClientOpen] = useState(false)
  const [savingSearchClient, setSavingSearchClient] = useState(false)
  const [editingSearchClientId, setEditingSearchClientId] = useState<string | null>(null)
  const [searchProvider, setSearchProvider] = useState<SearchProvider>("tavily")
  const [searchApiKey, setSearchApiKey] = useState("")
  const [searchIsDefault, setSearchIsDefault] = useState(false)

  const [alias, setAlias] = useState("")
  const [provider, setProvider] = useState(MODEL_PROVIDERS[0].value)
  const [apiKey, setApiKey] = useState("")
  const [apiUrl, setApiUrl] = useState("")
  const [modelName, setModelName] = useState("")

  const selectedModel = props.modelList.find((item) => item.value === props.model)

  const loadCurrentApiKey = useCallback(async () => {
    if (!selectedModel) {
      setCurrentApiKey("")
      return
    }
    const key = await getModelApiKey(selectedModel.value, props.modelList)
    setCurrentApiKey(key)
  }, [selectedModel, props.modelList])

  useEffect(() => {
    if (props.open) {
      loadCurrentApiKey()
    }
  }, [props.open, loadCurrentApiKey])

  const saveCurrentModelApiKey = async () => {
    if (!selectedModel) {
      return
    }
    setApiKeySaving(true)
    const updatedModels = await saveModelApiKey(selectedModel.value, currentApiKey, props.modelList)
    props.onModelsChanged(updatedModels)
    setApiKeySaving(false)
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

  const openEditDialog = async (item: ManagedModel) => {
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
    if (isCustomProvider) {
      setApiUrl(item.apiUrl)
    } else {
      setApiUrl("")
    }
    const targetApiKey = await getModelApiKey(item.value, props.modelList)
    setApiKey(targetApiKey)
    setAddModelOpen(true)
  }

  const removeModel = (item: ManagedModel) => {
    if (!item.isCustom) {
      return
    }
    const shouldDelete = window.confirm(`确认删除模型「${item.label}」吗？`)
    if (!shouldDelete) {
      return
    }
    const updatedModels = deleteCustomModel(item.value)
    props.onModelsChanged(updatedModels)
  }

  const submitModel = async () => {
    setAddingModel(true)
    try {
      const updatedModels = editingModelValue
        ? await updateCustomModel({
            modelValue: editingModelValue,
            alias,
            provider,
            apiKey,
            apiUrl,
            modelName,
          })
        : await addCustomModel({
            alias,
            provider,
            apiKey,
            apiUrl,
            modelName,
          })
      props.onModelsChanged(updatedModels)
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
    setSearchIsDefault(false)
  }

  const openCreateSearchClientDialog = () => {
    resetSearchForm()
    setAddSearchClientOpen(true)
  }

  const openEditSearchClientDialog = async (item: SearchClient) => {
    setEditingSearchClientId(item.id)
    setSearchProvider(item.provider)
    setSearchIsDefault(item.isDefault)
    const apiKey = await getSearchClientApiKey(item.id)
    setSearchApiKey(apiKey)
    setAddSearchClientOpen(true)
  }

  const removeSearchClient = (item: SearchClient) => {
    const shouldDelete = window.confirm(`确认删除搜索客户端「${item.provider.toUpperCase()}」吗？`)
    if (!shouldDelete) {
      return
    }
    const updated = deleteSearchClient(item.id)
    props.onSearchClientsChanged(updated)
  }

  const submitSearchClient = async () => {
    setSavingSearchClient(true)
    try {
      const updated = editingSearchClientId
        ? await updateSearchClient({
            id: editingSearchClientId,
            provider: searchProvider,
            apiKey: searchApiKey,
            isDefault: searchIsDefault,
          })
        : await addSearchClient({
            provider: searchProvider,
            apiKey: searchApiKey,
            isDefault: searchIsDefault,
          })
      props.onSearchClientsChanged(updated)
      setAddSearchClientOpen(false)
      resetSearchForm()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSavingSearchClient(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理 API Key 与可用模型。</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="api">
          <TabsList>
            <TabsTrigger value="api">API Key</TabsTrigger>
            <TabsTrigger value="models">模型管理</TabsTrigger>
            <TabsTrigger value="web-search">网络搜索</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="mt-4">
            <div className="grid gap-4">
              <div className="text-sm text-muted-foreground">
                当前选中模型：
                <span className="ml-2 font-medium text-foreground">
                  {selectedModel?.label ?? "-"}
                </span>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current-model-api-key">API Key</Label>
                <Input
                  id="current-model-api-key"
                  type="password"
                  value={currentApiKey}
                  onChange={(event) => setCurrentApiKey(event.target.value)}
                  placeholder="输入当前模型的 API Key"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => props.onOpenChange(false)}>
                取消
              </Button>
              <Button disabled={apiKeySaving} onClick={saveCurrentModelApiKey}>
                {apiKeySaving ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="models" className="mt-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-input p-3">
              <p className="text-sm text-muted-foreground">
                注意事项：模型需要支持图像多模态，否则无法正常运行。
              </p>
              <Button onClick={openCreateDialog}>添加模型</Button>
            </div>

            <div className="mt-4 space-y-3">
              {props.modelList.map((item) => (
                <div
                  key={item.value}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-input p-3"
                >
                  <span className="font-medium">{item.label}</span>
                  <Badge variant="secondary">{item.providerLabel}</Badge>
                  <Badge variant="outline">{item.modelScript}</Badge>
                  <span className="text-xs text-muted-foreground">model: {item.modelName}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {item.isCustom ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(item)}
                          className="h-8"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          编辑
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeModel(item)}
                          className="h-8"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline">内置</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="web-search" className="mt-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-input p-3">
              <p className="text-sm text-muted-foreground">管理联网搜索客户端（当前支持 Tavily）。</p>
              <Button onClick={openCreateSearchClientDialog}>添加搜索客户端</Button>
            </div>

            <div className="mt-4 space-y-3">
              {props.searchClients.length === 0 && (
                <div className="rounded-md border border-input p-3 text-sm text-muted-foreground">
                  暂无搜索客户端，请先添加。
                </div>
              )}
              {props.searchClients.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-md border border-input p-3">
                  <span className="font-medium">{item.provider.toUpperCase()}</span>
                  <Badge variant="secondary">Search Client</Badge>
                  {item.isDefault ? (
                    <Badge>默认</Badge>
                  ) : (
                    <Badge variant="outline">非默认</Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditSearchClientDialog(item)}
                      className="h-8"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      编辑
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeSearchClient(item)}
                      className="h-8"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

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
              <DialogTitle>{editingModelValue ? "编辑模型" : "添加模型"}</DialogTitle>
              <DialogDescription>
                填写模型信息后将保存到本地，API Key 使用 AES 加密存储。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="model-alias">模型别名</Label>
                <Input
                  id="model-alias"
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder="例如：我的 DeepSeek-V3"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-provider">模型服务商</Label>
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
                  placeholder="输入服务商 API Key"
                />
              </div>

              {provider === CUSTOM_PROVIDER_VALUE && (
                <div className="grid gap-2">
                  <Label htmlFor="model-api-url">模型 API URL</Label>
                  <Input
                    id="model-api-url"
                    value={apiUrl}
                    onChange={(event) => setApiUrl(event.target.value)}
                    placeholder="例如：https://example.com/v1"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="model-name">模型名称</Label>
                <Input
                  id="model-name"
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                  placeholder="例如：deepseek-chat / gpt-4o / gemini-1.5-pro"
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
                取消
              </Button>
              <Button disabled={addingModel} onClick={submitModel}>
                {addingModel ? "保存中..." : editingModelValue ? "保存修改" : "确定"}
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
              <DialogTitle>{editingSearchClientId ? "编辑搜索客户端" : "添加搜索客户端"}</DialogTitle>
              <DialogDescription>
                API Key 将使用 AES 加密存储。若设为默认，将自动取消其余客户端默认状态。
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="search-provider">提供商</Label>
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
                  placeholder="输入 Tavily API Key"
                />
              </div>

              <div className="grid gap-2">
                <Label>是否为默认</Label>
                <Button
                  type="button"
                  variant={searchIsDefault ? "default" : "outline"}
                  onClick={() => setSearchIsDefault((value) => !value)}
                >
                  {searchIsDefault ? "已设为默认" : "设为默认"}
                </Button>
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
                取消
              </Button>
              <Button disabled={savingSearchClient} onClick={submitSearchClient}>
                {savingSearchClient ? "保存中..." : editingSearchClientId ? "保存修改" : "确定"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
