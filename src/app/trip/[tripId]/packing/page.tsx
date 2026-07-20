"use client";

/**
 * 打包清单页面
 *
 * 灵感来源：PackPoint 的上下文感知打包建议 + TREK 的清单管理
 * - 一键智能推荐（根据天数/目的地/活动）
 * - 按分类分组展示
 * - 打包进度条
 * - 自定义增删改查
 */

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTripStore } from "@/stores/trip-store";
import { useHydrated } from "@/hooks/useHydrated";
import { daysBetween, cn } from "@/lib/utils";
import { PACKING_CATEGORIES, getPackingCategoryConfig } from "@/lib/constants";
import { generatePackingSuggestions } from "@/lib/packing-suggest";
import { toast, Modal, FormField, Button, Badge } from "@/components/ui";
import {
  Plus,
  Sparkles,
  Trash2,
  Check,
  Package,
  Loader2,
} from "lucide-react";
import type { PackingCategory, PackingItem } from "@/types";

const CATEGORY_ORDER: PackingCategory[] = [
  "essentials",
  "clothing",
  "toiletries",
  "electronics",
  "documents",
  "miscellaneous",
];

export default function PackingPage() {
  const params = useParams<{ tripId: string }>();
  const hydrated = useHydrated();
  const trip = useTripStore((s) => s.trips.find((t) => t.id === params.tripId));
  const allPlaces = useTripStore((s) => s.places);
  const packingItems = useTripStore((s) => s.packingItems);
  const addPackingItem = useTripStore((s) => s.addPackingItem);
  const deletePackingItem = useTripStore((s) => s.deletePackingItem);
  const togglePackingItem = useTripStore((s) => s.togglePackingItem);
  const bulkAddPackingItems = useTripStore((s) => s.bulkAddPackingItems);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);

  const items = useMemo(
    () => packingItems.filter((p) => p.tripId === params.tripId),
    [packingItems, params.tripId]
  );

  const places = useMemo(
    () => allPlaces.filter((p) => p.tripId === params.tripId),
    [allPlaces, params.tripId]
  );

  // 按分类分组
  const grouped = useMemo(() => {
    const groups: Record<string, PackingItem[]> = {};
    for (const cat of CATEGORY_ORDER) {
      groups[cat] = [];
    }
    for (const item of items) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [items]);

  // 打包进度
  const progress = useMemo(() => {
    if (items.length === 0) return 0;
    const packed = items.filter((i) => i.packed).length;
    return Math.round((packed / items.length) * 100);
  }, [items]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) return null;

  const days = daysBetween(trip.startDate, trip.endDate);

  const handleSmartSuggest = () => {
    const existing = new Set(items.map((i) => i.name));
    const suggestions = generatePackingSuggestions(trip.destination, days, places);
    const newItems = suggestions
      .filter((s) => !existing.has(s.name))
      .map((s) => ({
        tripId: trip.id,
        name: s.name,
        category: s.category,
        packed: false,
        quantity: s.quantity,
        suggested: true,
        notes: s.reason,
      }));

    if (newItems.length === 0) {
      toast.info("已包含所有推荐物品", "没有新的建议需要添加");
      setShowSuggest(false);
      return;
    }

    bulkAddPackingItems(newItems);
    toast.success("已添加智能推荐", `共添加 ${newItems.length} 件物品`);
    setShowSuggest(false);
  };

  return (
    <div className="space-y-5">
      {/* 打包进度 */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">打包进度</h2>
              <p className="text-sm text-muted-foreground">
                {items.filter((i) => i.packed).length} / {items.length} 件已打包
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => setShowSuggest(true)}
            >
              智能推荐
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddForm(true)}
            >
              添加物品
            </Button>
          </div>
        </div>
        {/* 进度条 */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor:
                progress === 100
                  ? "#10b981"
                  : progress >= 50
                  ? "#3b82f6"
                  : "#f59e0b",
            }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          {progress}% 完成
          {progress === 100 && items.length > 0 && " · 打包完成！"}
        </p>
      </div>

      {/* 按分类展示 */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-medium">还没有打包清单</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            点击「智能推荐」一键生成，或手动添加物品
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.map((category) => {
            const catItems = grouped[category] ?? [];
            if (catItems.length === 0) return null;
            const config = getPackingCategoryConfig(category);
            const packedInCat = catItems.filter((i) => i.packed).length;
            return (
              <div
                key={category}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div
                  className="flex items-center justify-between border-b border-border px-4 py-2.5"
                  style={{ backgroundColor: `${config.color}10` }}
                >
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {packedInCat}/{catItems.length}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {catItems.map((item) => (
                    <PackingItemRow
                      key={item.id}
                      item={item}
                      color={config.color}
                      onToggle={() => togglePackingItem(item.id)}
                      onDelete={() => {
                        deletePackingItem(item.id);
                        toast.success("已删除", item.name);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 添加物品弹窗 */}
      {showAddForm && (
        <AddItemModal
          onClose={() => setShowAddForm(false)}
          onAdd={(data) => {
            addPackingItem({
              tripId: trip.id,
              name: data.name,
              category: data.category,
              packed: false,
              quantity: data.quantity,
              suggested: false,
            });
            setShowAddForm(false);
            toast.success("已添加", data.name);
          }}
        />
      )}

      {/* 智能推荐预览弹窗 */}
      {showSuggest && (
        <SuggestModal
          destination={trip.destination}
          days={days}
          places={places}
          existingNames={new Set(items.map((i) => i.name))}
          onClose={() => setShowSuggest(false)}
          onConfirm={handleSmartSuggest}
        />
      )}
    </div>
  );
}

/** 单个打包物品行 */
function PackingItemRow({
  item,
  color,
  onToggle,
  onDelete,
}: {
  item: PackingItem;
  color: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50">
      {/* 复选框 */}
      <button
        onClick={onToggle}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          item.packed
            ? "border-transparent text-white"
            : "border-muted-foreground/30 hover:border-foreground"
        )}
        style={item.packed ? { backgroundColor: color } : undefined}
        aria-label={item.packed ? "取消打包" : "标记为已打包"}
      >
        {item.packed && <Check className="h-3.5 w-3.5" />}
      </button>

      {/* 物品信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm",
              item.packed && "text-muted-foreground line-through"
            )}
          >
            {item.name}
          </span>
          {item.quantity > 1 && (
            <Badge variant="default">×{item.quantity}</Badge>
          )}
          {item.suggested && (
            <Badge variant="info">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              推荐
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.notes}</p>
        )}
      </div>

      {/* 删除按钮 */}
      <button
        onClick={onDelete}
        className="rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="删除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** 添加物品弹窗 */
function AddItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    category: PackingCategory;
    quantity: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PackingCategory>("essentials");
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), category, quantity });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="添加打包物品"
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" type="submit" form="add-packing-form">添加</Button>
        </>
      }
    >
      <form id="add-packing-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="物品名称" required>
          {({ id, ariaDescribedBy }) => (
            <input
              id={id}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：护照"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-describedby={ariaDescribedBy}
              required
              autoFocus
            />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="分类">
            {({ id, ariaDescribedBy }) => (
              <select
                id={id}
                value={category}
                onChange={(e) => setCategory(e.target.value as PackingCategory)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                aria-describedby={ariaDescribedBy}
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>
                    {PACKING_CATEGORIES[cat].label}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormField label="数量">
            {({ id, ariaDescribedBy }) => (
              <input
                id={id}
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                aria-describedby={ariaDescribedBy}
              />
            )}
          </FormField>
        </div>
      </form>
    </Modal>
  );
}

/** 智能推荐预览弹窗 */
function SuggestModal({
  destination,
  days,
  places,
  existingNames,
  onClose,
  onConfirm,
}: {
  destination: string;
  days: number;
  places: { name: string; type: string }[];
  existingNames: Set<string>;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const suggestions = useMemo(
    () => generatePackingSuggestions(destination, days, places as never),
    [destination, days, places]
  );

  const newSuggestions = suggestions.filter((s) => !existingNames.has(s.name));

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="智能打包推荐"
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={newSuggestions.length === 0}
          >
            添加 {newSuggestions.length} 件推荐物品
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p>
              根据 <strong>{destination}</strong> 的 {days} 天行程，结合地点活动类型，为你推荐以下物品：
            </p>
          </div>
        </div>

        {newSuggestions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            所有推荐物品已在清单中
          </p>
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {newSuggestions.map((s) => {
              const config = getPackingCategoryConfig(s.category);
              return (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm font-medium">{s.name}</span>
                    {s.quantity > 1 && (
                      <Badge variant="default">×{s.quantity}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {config.label}
                    </span>
                    {existingNames.has(s.name) && (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
