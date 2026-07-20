"use client";

import { useState, useEffect } from "react";
import { PLACE_TYPES } from "@/lib/constants";
import { PlaceSearch } from "@/components/itinerary/PlaceSearch";
import { Modal, FormField, Button } from "@/components/ui";
import type { Place, PlaceType } from "@/types";

interface PlaceFormModalProps {
  place: Place | null; // null 表示新建
  defaultType?: PlaceType;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    type: PlaceType;
    address?: string;
    stayMinutes?: number;
    lat?: number;
    lng?: number;
  }) => void;
}

export function PlaceFormModal({
  place,
  defaultType = "attraction",
  onClose,
  onSubmit,
}: PlaceFormModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PlaceType>(defaultType);
  const [address, setAddress] = useState("");
  const [stayMinutes, setStayMinutes] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // 编辑模式时填充已有数据（依赖 place?.id 而非 place 对象引用）
  useEffect(() => {
    if (place) {
      setName(place.name);
      setType(place.type);
      setAddress(place.address ?? "");
      setStayMinutes(place.stayMinutes?.toString() ?? "");
      setLat(place.lat?.toString() ?? "");
      setLng(place.lng?.toString() ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      type,
      address: address.trim() || undefined,
      stayMinutes: (() => {
        const n = parseInt(stayMinutes, 10);
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      })(),
      lat: (() => {
        const n = parseFloat(lat);
        return Number.isFinite(n) && n >= -90 && n <= 90 ? n : undefined;
      })(),
      lng: (() => {
        const n = parseFloat(lng);
        return Number.isFinite(n) && n >= -180 && n <= 180 ? n : undefined;
      })(),
    });
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={place ? "编辑地点" : "添加地点"}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" size="sm" type="submit" form="place-form">
            {place ? "保存" : "添加"}
          </Button>
        </>
      }
    >
      <form id="place-form" onSubmit={handleSubmit} className="space-y-4">
        {/* 地点搜索（仅新建模式显示） */}
        {!place && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              搜索地点
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                （选填，搜索后自动填充下方信息）
              </span>
            </label>
            <PlaceSearch
              onSelect={(result) => {
                setName(result.name);
                setType(result.type);
                setAddress(result.address);
                setLat(result.lat.toString());
                setLng(result.lng.toString());
              }}
            />
            <div className="mt-2 border-t border-border pt-2">
              <p className="text-center text-xs text-muted-foreground">
                或手动填写下方信息
              </p>
            </div>
          </div>
        )}

        {/* 名称 */}
        <FormField label="名称" required>
          {({ id }) => (
            <input
              id={id}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：东京塔"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              required
            />
          )}
        </FormField>

        {/* 类型选择 */}
        <FormField label="类型">
          {() => (
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLACE_TYPES) as PlaceType[]).map((t) => {
                const config = PLACE_TYPES[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      type === t
                        ? "border-primary font-medium"
                        : "border-border hover:bg-secondary"
                    }`}
                    style={
                      type === t
                        ? { backgroundColor: `${config.color}20`, color: config.color }
                        : undefined
                    }
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </FormField>

        {/* 地址 */}
        <FormField label="地址">
          {({ id }) => (
            <input
              id={id}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="详细地址（可选）"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </FormField>

        {/* 停留时长 */}
        <FormField label="停留时长（分钟）">
          {({ id }) => (
            <input
              id={id}
              type="number"
              min="0"
              step="5"
              value={stayMinutes}
              onChange={(e) => setStayMinutes(e.target.value)}
              placeholder="例如：90"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </FormField>

        {/* 经纬度（用于地图显示） */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="纬度">
            {({ id }) => (
              <input
                id={id}
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="35.6586"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </FormField>
          <FormField label="经度">
            {({ id }) => (
              <input
                id={id}
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="139.7454"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </FormField>
        </div>
      </form>
    </Modal>
  );
}
