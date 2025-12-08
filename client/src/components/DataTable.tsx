import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
  filterValue?: (item: T) => string; // Function to get filterable value for columns with custom renderers
  sortValue?: (item: T) => any; // Function to get sortable value for columns with custom renderers
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  selectedItems?: Set<string>;
  onSelectItem?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  selectable?: boolean;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  getItemId?: (item: T) => string;
}

export function DataTable<T>({
  data,
  columns,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll,
  selectable = false,
  onRowClick,
  loading = false,
  emptyMessage = "No data available",
  className,
  getItemId = (item: any) => item.id,
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked);
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    result = result.filter(item => {
      return columns.every(column => {
        if (!column.filterable || !filters[column.key as string]) {
          return true;
        }

        const filterValue = filters[column.key as string].toLowerCase();
        let itemValue: string;

        if (column.filterValue) {
          // Use custom filter value function for columns with complex rendering
          itemValue = column.filterValue(item).toLowerCase();
        } else {
          // Use raw value from the data
          const rawValue = (item as any)[column.key];
          if (rawValue == null) return true;
          itemValue = String(rawValue).toLowerCase();
        }

        return itemValue.includes(filterValue);
      });
    });

    // Apply sorting
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        // Handle rendered columns differently
        const column = columns.find(col => col.key === sortField);
        if (column?.sortValue) {
          // Use custom sort value function for columns with complex rendering
          aValue = column.sortValue(a);
          bValue = column.sortValue(b);
        } else {
          // Use raw value from the data
          aValue = (a as any)[sortField];
          bValue = (b as any)[sortField];
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortField, sortDirection, columns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <table className="w-full">
        <thead className="bg-muted/30">
          {/* Filter Row */}
          <tr className="border-b border-border">
            {selectable && <th className="px-4 py-2 w-12"></th>}
            {columns.map((column) => (
              <th key={`filter-${column.key}`} className={cn("px-4 py-2", column.width)}>
                {column.filterable && (
                  <Input
                    placeholder={`Filter ${column.header.toLowerCase()}...`}
                    value={filters[column.key as string] || ""}
                    onChange={(e) => handleFilterChange(column.key as string, e.target.value)}
                    className="h-8 text-xs"
                  />
                )}
              </th>
            ))}
          </tr>
          {/* Header Row */}
          <tr className="border-b border-border">
            {selectable && (
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground w-12">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleSelectAll(selectedItems.size !== filteredAndSortedData.length)}
                  title={selectedItems.size === filteredAndSortedData.length ? "Deselect all" : "Select all"}
                >
                  {selectedItems.size === filteredAndSortedData.length && filteredAndSortedData.length > 0 ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </Button>
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key as string}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
                  column.sortable && "cursor-pointer hover:bg-muted/50 select-none",
                  column.width
                )}
                onClick={column.sortable ? () => handleSort(column.key as string) : undefined}
              >
                <div className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortField === column.key ? (
                    sortDirection === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : sortDirection === "desc" ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : null
                  ) : column.sortable ? (
                    <ChevronsUpDown className="w-3 h-3 opacity-50" />
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {filteredAndSortedData.map((item) => {
            const itemId = getItemId(item);
            return (
              <tr
                key={itemId}
                className={cn(
                  "transition-colors",
                  onRowClick ? "hover:bg-muted/20 cursor-pointer" : "hover:bg-muted/20"
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {selectable && (
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedItems.has(itemId)}
                      onCheckedChange={(checked) => onSelectItem?.(itemId, checked as boolean)}
                      aria-label={`Select item`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key as string} className={cn("px-4 py-4", column.width)}>
                    {column.render ? column.render((item as any)[column.key], item) : (item as any)[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredAndSortedData.length === 0 && data.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No items match your current filters. Try adjusting your search criteria.
        </div>
      )}

      {data.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
