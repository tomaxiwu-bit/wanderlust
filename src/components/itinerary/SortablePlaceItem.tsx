"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Clock, Trash2, Pencil } from "lucide-react";
import { getPlaceTypeConfig } from "@/lib/constants";
import { formatDuration, cn } from "@/lib/utils";
import type { Place } from "@/types";

interface SortablePlaceItemProps {
  place: Place;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (place: Place) => void;
}

export function SortablePlaceItem({
  place,
  index,
  onDelete,
  onEdit,
}: SortablePlaceItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = getPlaceTypeConfig(place.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50",
        isDragging && "z-50 opacity-80 shadow-lg ring-2 ring-primary"
      )}
    >
      {/* 拖拽手柄 */}
      <button
        {...attributes}
        {...listeners}
        className="flex min-h-[36px] min-w-[36px] cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="拖拽排序"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* 序号 */}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
        {index + 1}
      </span>

      {/* 名称与类型 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{place.name}</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              backgroundColor: `${config.color}20`,
              color: config.color,
            }}
          >
            {config.label}
          </span>
        </div>
        {place.address && (
          <p className="text-xs text-muted-foreground">{place.address}</p>
        )}
      </div>

      {/* 停留时长 */}
      {place.stayMinutes ? (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDuration(place.stayMinutes)}
        </span>
      ) : null}

      {/* 操作按钮 */}
      <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
      {/* 编辑按钮 */}
      <button
        onClick={() => onEdit(place)}
        className="rounded p-2 text-muted-foreground transition-colors hover:text-primary"
        aria-label="编辑地点"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {/* 删除按钮 */}
      <button
        onClick={() => onDelete(place.id)}
        className="rounded p-2 text-muted-foreground transition-colors hover:text-destructive"
        aria-label="删除地点"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}
