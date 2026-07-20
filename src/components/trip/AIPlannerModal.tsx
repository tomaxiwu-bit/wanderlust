"use client";

/**
 * AI 行程规划弹窗
 *
 * 灵感来源：Wanderboat AI 的对话式行程生成
 * - 自然语言输入
 * - 实时解析展示（目的地/天数/偏好）
 * - 匹配模板或生成框架
 * - 一键创建行程
 */

import { useState, useMemo } from "react";
import { Modal, Button, Badge } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { useTripStore } from "@/stores/trip-store";
import { useHydrated } from "@/hooks/useHydrated";
import { generateItinerary, parseIntent, suggestPlaceName } from "@/lib/ai-planner";
import { getPlaceTypeConfig } from "@/lib/constants";
import {
  Sparkles,
  Wand2,
  MapPin,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";

const EXAMPLE_PROMPTS = [
  "3天北京游，喜欢历史文化和美食",
  "5天云南，想看自然风光",
  "成都3日游，吃货必去",
  "西安4天，历史古迹和博物馆",
  "三亚5天海滩度假",
];

interface AIPlannerModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIPlannerModal({ open, onClose }: AIPlannerModalProps) {
  const [input, setInput] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const router = useRouter();
  const addTrip = useTripStore((s) => s.addTrip);
  const addPlace = useTripStore((s) => s.addPlace);
  const hydrated = useHydrated();

  const parsed = useMemo(
    () => (input.trim() ? parseIntent(input) : null),
    [input]
  );

  const generated = useMemo(
    () => (hasGenerated && input.trim() ? generateItinerary(input) : null),
    [hasGenerated, input]
  );

  const handleGenerate = () => {
    if (!input.trim()) {
      toast.error("请输入描述", "例如：3天北京游，喜欢历史文化");
      return;
    }
    setHasGenerated(true);
  };

  const handleCreate = () => {
    if (!generated || !hydrated) return;

    // 创建行程
    const today = new Date();
    const startDate = format(today, "yyyy-MM-dd");
    const endDate = format(addDays(today, generated.days - 1), "yyyy-MM-dd");

    const newTrip = addTrip({
      userId: "local",
      title: generated.title,
      description: generated.description,
      destination: generated.destination,
      startDate,
      endDate,
      status: "planning",
      visibility: "private",
      baseCurrency: "CNY",
    });

    // 如果匹配了模板，提示用户去探索页 fork
    if (generated.matchedTemplateId) {
      toast.success(
        "行程已创建",
        `已匹配到攻略模板「${generated.matchedTemplateTitle}」，你可以在探索页 fork 完整模板`
      );
    }

    // 为每天创建建议的占位地点
    for (let day = 0; day < generated.days; day++) {
      const types = generated.dailyPlaceTypes[day] ?? [];
      for (let order = 0; order < types.length; order++) {
        const type = types[order];
        addPlace({
          tripId: newTrip.id,
          dayIndex: day,
          name: suggestPlaceName(type, day),
          type,
          order,
          stayMinutes: type === "restaurant" ? 60 : type === "hotel" ? 480 : 120,
          notes: `Day ${day + 1} · ${generated.dailyThemes[day] ?? ""}`,
        });
      }
    }

    toast.success("行程已创建", `已生成 ${generated.days} 天的行程框架`);
    onClose();
    setInput("");
    setHasGenerated(false);
    router.push(`/trip/${newTrip.id}`);
  };

  const handleClose = () => {
    onClose();
    setInput("");
    setHasGenerated(false);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="AI 智能规划"
      size="lg"
      footer={
        !generated ? (
          <>
            <Button variant="outline" size="sm" onClick={handleClose}>取消</Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Wand2 className="h-4 w-4" />}
              onClick={handleGenerate}
            >
              生成行程
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setHasGenerated(false)}>重新生成</Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={handleCreate}
            >
              创建行程
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {!generated ? (
          <>
            {/* 输入区 */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                描述你想要的行程
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例如：3天北京游，喜欢历史文化和美食"
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            {/* 实时解析预览 */}
            {parsed && (parsed.destination || parsed.days !== 3 || parsed.preferences.length > 0) && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  识别到的信息
                </p>
                <div className="flex flex-wrap gap-2">
                  {parsed.destination && (
                    <Badge variant="primary">
                      <MapPin className="mr-1 h-3 w-3" />
                      {parsed.destination}
                    </Badge>
                  )}
                  <Badge variant="info">
                    <Calendar className="mr-1 h-3 w-3" />
                    {parsed.days} 天
                  </Badge>
                  {parsed.preferences.map((pref) => (
                    <Badge key={pref} variant="success">
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 示例提示 */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />
                试试这些
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* 生成结果 */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">已为你生成行程方案</span>
              </div>
              <h3 className="text-lg font-bold">{generated.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {generated.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {generated.tags.map((tag) => (
                  <Badge key={tag} variant="success">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* 模板匹配提示 */}
            {generated.matchedTemplateTitle && (
              <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <div>
                  <p>已匹配到攻略模板：<strong>{generated.matchedTemplateTitle}</strong></p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    创建后可在「探索」页面 fork 完整模板获取详细景点信息
                  </p>
                </div>
              </div>
            )}

            {/* 每日安排预览 */}
            <div>
              <p className="mb-2 text-sm font-medium">每日行程框架</p>
              <div className="space-y-2">
                {generated.dailyThemes.map((theme, day) => {
                  const types = generated.dailyPlaceTypes[day] ?? [];
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {day + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{theme}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {types.map((type, idx) => {
                            const config = getPlaceTypeConfig(type);
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs"
                                style={{
                                  color: config.color,
                                  backgroundColor: `${config.color}15`,
                                }}
                              >
                                {config.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              <ArrowRight className="mr-1 inline h-3 w-3" />
              点击「创建行程」将生成 {generated.days} 天的行程框架，每含 {generated.dailyPlaceTypes[0]?.length ?? 4} 个建议地点，可后续编辑补充
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
