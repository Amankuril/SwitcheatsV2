import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import Lenis from "lenis"
import { ArrowLeft, Settings, ChevronRight } from "lucide-react"
import { Switch } from "@food/components/ui/switch"
import { Card, CardContent } from "@food/components/ui/card"
import { restaurantAPI } from "@food/api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Button } from "@food/components/ui/button"
import {
  broadcastRestaurantOperationalStatus,
  getOutletScheduleStatus,
  getRestaurantOperationalStatus,
  shouldAutoTurnOffAcceptingOrders,
} from "@food/utils/restaurantOperationalStatus"

export default function RestaurantStatus() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const [restaurantData, setRestaurantData] = useState(null)
  const [outletTimings, setOutletTimings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showOutletClosedDialog, setShowOutletClosedDialog] = useState(false)
  const [showOutsideTimingsDialog, setShowOutsideTimingsDialog] = useState(false)
  const autoSyncingRef = useRef(false)

  const restaurantForStatus = useMemo(
    () =>
      restaurantData
        ? {
            ...restaurantData,
            outletTimings,
          }
        : null,
    [restaurantData, outletTimings],
  )

  const operationalStatus = useMemo(() => {
    if (!restaurantForStatus) return null
    return getRestaurantOperationalStatus(restaurantForStatus, currentDateTime)
  }, [restaurantForStatus, currentDateTime])

  const schedule = useMemo(() => {
    if (!restaurantForStatus) return null
    return getOutletScheduleStatus(restaurantForStatus, currentDateTime)
  }, [restaurantForStatus, currentDateTime])

  const applyRestaurantPayload = useCallback((restaurant, timings) => {
    if (restaurant) {
      setRestaurantData(restaurant)
    }
    if (timings) {
      setOutletTimings(timings)
    }
    const merged = {
      ...(restaurant || {}),
      outletTimings: timings || restaurant?.outletTimings || outletTimings,
    }
    const operational = getRestaurantOperationalStatus(merged, new Date())
    broadcastRestaurantOperationalStatus(operational)
    return operational
  }, [outletTimings])

  const loadRestaurantState = useCallback(async () => {
    try {
      setLoading(true)
      const [restaurantRes, timingsRes] = await Promise.all([
        restaurantAPI.getCurrentRestaurant(),
        restaurantAPI.getOutletTimings().catch(() => null),
      ])

      const restaurant =
        restaurantRes?.data?.data?.restaurant || restaurantRes?.data?.restaurant || null
      const timings =
        timingsRes?.data?.data?.outletTimings ||
        timingsRes?.data?.outletTimings ||
        restaurant?.outletTimings ||
        null

      if (restaurant) {
        applyRestaurantPayload(restaurant, timings)
      } else {
        broadcastRestaurantOperationalStatus({
          isEffectivelyOnline: false,
          isAcceptingOrders: false,
        })
      }
    } catch (error) {
      if (
        error.code !== "ERR_NETWORK" &&
        error.code !== "ECONNABORTED" &&
        !error.message?.includes("timeout")
      ) {
        toast.error("Failed to load restaurant status")
      }
      broadcastRestaurantOperationalStatus({
        isEffectivelyOnline: false,
        isAcceptingOrders: false,
      })
    } finally {
      setLoading(false)
    }
  }, [applyRestaurantPayload])

  useEffect(() => {
    loadRestaurantState()
  }, [loadRestaurantState])

  useEffect(() => {
    const tickDateTime = () => {
      if (typeof document !== "undefined" && document.hidden) return
      setCurrentDateTime(new Date())
    }
    const interval = setInterval(tickDateTime, 60000)
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        setCurrentDateTime(new Date())
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const loadOutletTimings = () => {
      restaurantAPI
        .getOutletTimings()
        .then((res) => {
          const data = res?.data?.data?.outletTimings || res?.data?.outletTimings
          if (data) {
            setOutletTimings(data)
            if (restaurantData) {
              applyRestaurantPayload(restaurantData, data)
            }
          }
        })
        .catch(() => {})
    }

    window.addEventListener("outletTimingsUpdated", loadOutletTimings)
    return () => window.removeEventListener("outletTimingsUpdated", loadOutletTimings)
  }, [applyRestaurantPayload, restaurantData])

  useEffect(() => {
    if (!restaurantForStatus || autoSyncingRef.current) return
    if (!shouldAutoTurnOffAcceptingOrders(restaurantForStatus, currentDateTime)) return

    autoSyncingRef.current = true
    restaurantAPI
      .updateAcceptingOrders(false)
      .then((res) => {
        const restaurant =
          res?.data?.data?.restaurant || res?.data?.restaurant || {
            ...restaurantData,
            isAcceptingOrders: false,
            outsideHoursOverride: false,
          }
        applyRestaurantPayload(restaurant, outletTimings)
      })
      .catch(() => {
        setRestaurantData((prev) =>
          prev
            ? {
                ...prev,
                isAcceptingOrders: false,
                outsideHoursOverride: false,
              }
            : prev,
        )
        broadcastRestaurantOperationalStatus(
          getRestaurantOperationalStatus(
            {
              ...restaurantForStatus,
              isAcceptingOrders: false,
              outsideHoursOverride: false,
            },
            currentDateTime,
          ),
        )
      })
      .finally(() => {
        autoSyncingRef.current = false
      })
  }, [restaurantForStatus, currentDateTime, applyRestaurantPayload, outletTimings, restaurantData])

  useEffect(() => {
    if (operationalStatus) {
      broadcastRestaurantOperationalStatus(operationalStatus)
    }
  }, [operationalStatus])

  const persistAvailability = async (checked, options = {}) => {
    setSaving(true)
    try {
      const response = await restaurantAPI.updateAcceptingOrders(checked, options)
      const restaurant = response?.data?.data?.restaurant || response?.data?.restaurant
      if (restaurant) {
        applyRestaurantPayload(restaurant, outletTimings)
      } else if (restaurantData) {
        const nextRestaurant = {
          ...restaurantData,
          isAcceptingOrders: checked,
          outsideHoursOverride: options.outsideHoursOverride === true,
        }
        applyRestaurantPayload(nextRestaurant, outletTimings)
      }
      toast.success(checked ? "You are now online for orders" : "You are now offline")
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to update delivery status"
      toast.error(message)
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDeliveryStatusChange = async (checked) => {
    if (saving || !schedule) return

    if (checked) {
      if (schedule.isDayClosed) {
        setShowOutletClosedDialog(true)
        return
      }
      if (!schedule.isOpen) {
        setShowOutsideTimingsDialog(true)
        return
      }
    }

    await persistAvailability(checked)
  }

  const handleConfirmOutsideHours = async () => {
    setShowOutsideTimingsDialog(false)
    await persistAvailability(true, { outsideHoursOverride: true })
  }

  const handleGoToOutletTimings = () => {
    setShowOutletClosedDialog(false)
    navigate("/restaurant/outlet-timings")
  }

  const formatTime12Hour = (time24) => {
    if (!time24) return ""
    const [hours, minutes] = time24.split(":").map(Number)
    const period = hours >= 12 ? "pm" : "am"
    const hours12 = hours % 12 || 12
    const minutesStr = minutes.toString().padStart(2, "0")
    return `${hours12}:${minutesStr} ${period}`
  }

  const getCurrentDayTimings = () => {
    if (!schedule?.openingTime || !schedule?.closingTime || schedule.isDayClosed) {
      return null
    }
    return {
      openingTime: formatTime12Hour(schedule.openingTime),
      closingTime: formatTime12Hour(schedule.closingTime),
    }
  }

  const formatAddress = (location) => {
    if (!location) return ""
    const parts = []
    if (location.area) parts.push(location.area.trim())
    if (location.city) parts.push(location.city.trim())
    return parts.join(", ") || ""
  }

  const toggleChecked = operationalStatus?.isEffectivelyOnline === true
  const statusLabel = toggleChecked ? "Receiving orders" : "Not receiving orders"
  const statusDetail = operationalStatus?.outsideHoursOverride && !schedule?.isOpen
    ? "Online outside scheduled hours"
    : !schedule?.isOpen && !operationalStatus?.outsideHoursOverride
      ? "Outside outlet hours"
      : schedule?.isDayClosed
        ? "Outlet closed today"
        : statusLabel

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Restaurant status</h1>
            <p className="text-sm text-gray-500 mt-0.5">Synced with your outlet timings</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <Card className="bg-gray-50 border-none py-0 shadow-sm rounded-b-none rounded-t-lg">
          <CardContent className="p-4 gap-6 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-gray-900 mb-1">
                  {loading ? "Loading..." : restaurantData?.name || "Restaurant"}
                </h2>
                <p className="text-sm text-gray-500">
                  {loading ? "Loading..." : (
                    <>
                      {restaurantData?.id ? `ID: ${String(restaurantData.id).slice(-5)}` : ""}
                      {restaurantData?.location && formatAddress(restaurantData.location)
                        ? ` | ${formatAddress(restaurantData.location)}`
                        : ""}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => navigate("/restaurant/explore")}
                className="ml-3 p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors shrink-0"
                aria-label="Explore more"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-bold text-gray-900 mb-1.5">Delivery status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${toggleChecked ? "bg-green-500" : "bg-gray-600"}`} />
                  <p className="text-sm text-gray-500">{statusDetail}</p>
                </div>
              </div>
              <Switch
                checked={toggleChecked}
                disabled={saving || loading}
                onCheckedChange={handleDeliveryStatusChange}
                className="ml-4 data-[state=unchecked]:bg-gray-300 data-[state=checked]:bg-green-600"
              />
            </div>

            <p className="text-sm text-gray-700 mb-2">Current delivery slot</p>
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-gray-900">
                {loading ? "Loading..." : (
                  schedule?.isDayClosed
                    ? "Today is off"
                    : (() => {
                        const timings = getCurrentDayTimings()
                        if (timings) {
                          const dateStr = currentDateTime.toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })
                          return `${dateStr}, ${timings.openingTime} - ${timings.closingTime}`
                        }
                        return "Not configured"
                      })()
                )}
              </p>
              {!schedule?.isDayClosed && (
                <button
                  onClick={() => navigate("/restaurant/outlet-timings")}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {schedule && !schedule.isOpen && !schedule.isDayClosed && !toggleChecked ? (
          <div className="bg-pink-50 rounded-b-lg rounded-t-none p-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-gray-700 flex-1">
              You are outside your outlet hours. The toggle stays off automatically until your
              scheduled slot starts or you go online with extended hours.
            </p>
          </div>
        ) : null}

        {operationalStatus?.outsideHoursOverride && !schedule?.isOpen ? (
          <div className="bg-amber-50 rounded-b-lg rounded-t-none p-4 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <p className="text-sm text-gray-700 flex-1">
              You are online outside scheduled outlet hours. Turn off when service ends.
            </p>
          </div>
        ) : null}

        <Dialog open={showOutletClosedDialog} onOpenChange={setShowOutletClosedDialog}>
          <DialogContent className="sm:max-w-md p-4 w-[90%] gap-2 flex flex-col">
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg font-semibold text-gray-900 text-center">
                Outlet closed today
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 text-center">
                Your outlet timings mark today as closed. Update timings to go online.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button onClick={() => setShowOutletClosedDialog(false)} variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleGoToOutletTimings} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                Go to outlet timings
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showOutsideTimingsDialog} onOpenChange={setShowOutsideTimingsDialog}>
          <DialogContent className="sm:max-w-md p-4 w-[90%] gap-2 flex flex-col">
            <DialogHeader className="text-center">
              <DialogTitle className="text-lg font-semibold text-gray-900 text-center">
                Go online outside outlet hours?
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 text-center">
                You are outside your scheduled outlet hours. Confirm only if you want to accept
                orders during extended hours.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button onClick={() => setShowOutsideTimingsDialog(false)} variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button
                onClick={handleConfirmOutsideHours}
                disabled={saving}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? "Turning on..." : "Go online anyway"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
