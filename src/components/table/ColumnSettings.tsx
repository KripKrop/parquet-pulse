import { Settings2, GripVertical, Pin, PinOff, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ColumnSettingsProps {
  columnOrder: string[];
  visibleColumns: string[];
  pinnedColumns: string[];
  onToggleColumn: (col: string) => void;
  onReorder: (newOrder: string[]) => void;
  onTogglePin: (col: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onReset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors text-sm"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="truncate">{id}</span>
    </div>
  );
}

export function ColumnSettings({
  columnOrder,
  visibleColumns,
  pinnedColumns,
  onToggleColumn,
  onReorder,
  onTogglePin,
  onShowAll,
  onHideAll,
  onReset,
  open,
  onOpenChange,
}: ColumnSettingsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(String(active.id));
      const newIndex = columnOrder.indexOf(String(over.id));
      onReorder(arrayMove(columnOrder, oldIndex, newIndex));
    }
  };

  const visibleSet = new Set(visibleColumns);
  const pinnedSet = new Set(pinnedColumns);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Settings2 className="h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Column Settings</span>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onReset}>
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
        <Tabs defaultValue="visibility" className="w-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="visibility" className="flex-1 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              Visibility
            </TabsTrigger>
            <TabsTrigger value="order" className="flex-1 text-xs">
              <GripVertical className="h-3 w-3 mr-1" />
              Order
            </TabsTrigger>
            <TabsTrigger value="pin" className="flex-1 text-xs">
              <Pin className="h-3 w-3 mr-1" />
              Pin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visibility" className="mt-0">
            <div className="flex gap-1 p-2 border-b">
              <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={onShowAll}>
                Show All
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={onHideAll}>
                Hide All
              </Button>
            </div>
            <ScrollArea className="h-[250px]">
              <div className="p-2 space-y-0.5">
                {columnOrder.map((col) => (
                  <label
                    key={col}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/30 transition-colors cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={visibleSet.has(col)}
                      onCheckedChange={() => onToggleColumn(col)}
                    />
                    <span className="truncate">{col}</span>
                    {pinnedSet.has(col) && <Pin className="h-3 w-3 text-muted-foreground ml-auto" />}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="order" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="p-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
                    {columnOrder.map((col) => (
                      <SortableItem key={col} id={col} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pin" className="mt-0">
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-0.5">
                {columnOrder.map((col) => {
                  const isPinned = pinnedSet.has(col);
                  return (
                    <button
                      key={col}
                      onClick={() => onTogglePin(col)}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-sm text-left ${
                        isPinned ? "bg-primary/10 text-primary" : "hover:bg-accent/30"
                      }`}
                    >
                      {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4 text-muted-foreground" />}
                      <span className="truncate">{col}</span>
                      {isPinned && (
                        <span className="ml-auto text-xs text-muted-foreground">Pinned</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
