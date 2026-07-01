import { useCallback, useEffect, useState } from "react"
import { Search, RefreshCw, ShoppingBag, Loader2 } from "lucide-react"
import { adminAPI } from "@food/api"
import { toast } from "sonner"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"

const PAGE_SIZE = 20
const RUPEE = "\u20B9"

const formatDateTime = (value) => {
  if (!value) return "-"
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return String(value)
  }
}

export default function UserCarts() {
  const [carts, setCarts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCarts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getUserCarts({
        page,
        limit: PAGE_SIZE,
        ...(searchQuery ? { search: searchQuery } : {}),
      })
      const data = response?.data?.data || response?.data || {}
      setCarts(Array.isArray(data.carts) ? data.carts : [])
      setTotal(Number(data.total) || 0)
      setTotalPages(Math.max(1, Number(data.totalPages) || 1))
    } catch (error) {
      setCarts([])
      setTotal(0)
      setTotalPages(1)
      toast.error(error?.response?.data?.message || "Failed to load user carts")
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery])

  useEffect(() => {
    fetchCarts()
  }, [fetchCarts])

  const handleSearch = () => {
    setPage(1)
    setSearchQuery(searchInput.trim())
  }

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Carts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Items users added to cart but have not ordered yet.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search user, phone, restaurant..."
              className="pl-9 bg-white h-9"
            />
          </div>
          <Button
            onClick={handleSearch}
            size="sm"
            className="!bg-emerald-600 hover:!bg-emerald-700 !text-white border-0"
          >
            Search
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCarts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
        <span>
          {total > 0
            ? `Showing ${showingFrom}-${showingTo} of ${total} active carts`
            : "No active carts found"}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full max-w-full relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 backdrop-blur-[1px]">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && carts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="h-9 w-9 text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No user carts to display</p>
            <p className="text-xs text-slate-400 mt-1">
              Carts appear when logged-in users add items from the app.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    SI
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[160px]">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[140px]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                    Restaurant
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider min-w-[320px]">
                    Cart Items
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carts.map((cart, index) => (
                  <tr key={cart.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-800">
                        {cart.userName || "Unknown user"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-slate-600">{cart.userPhone || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 truncate block max-w-[180px]" title={cart.userEmail || ""}>
                        {cart.userEmail || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">
                          {cart.restaurantName || "-"}
                        </span>
                        {cart.restaurantId && (
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={cart.restaurantId}>
                            {cart.restaurantId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 min-w-[300px] max-w-[520px]">
                        {(cart.items || []).length > 0 ? (
                          (cart.items || []).map((item, itemIndex) => {
                            const qty = Number(item.quantity) || 1
                            const price = Number(item.price) || 0
                            return (
                              <div
                                key={`${item.lineItemId || item.itemId || itemIndex}`}
                                className="flex items-center gap-2 text-xs leading-tight"
                              >
                                <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded min-w-[2rem] text-center shrink-0">
                                  {qty}x
                                </span>
                                <span className="text-slate-800 font-medium truncate" title={item.name || "Item"}>
                                  {item.name || "Item"}
                                  {item.variantName ? ` (${item.variantName})` : ""}
                                </span>
                                <span className="text-slate-500 shrink-0">
                                  {RUPEE}{Math.round(price)}
                                </span>
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic">No items</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-slate-800">{cart.itemCount || 0}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {RUPEE}{Math.round(Number(cart.subtotal) || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-slate-600">{formatDateTime(cart.updatedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
