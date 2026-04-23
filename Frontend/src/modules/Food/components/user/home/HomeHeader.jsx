import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, Mic, Bell, CheckCircle2, Tag, Gift, AlertCircle, Clock, BellOff, X, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@food/components/ui/popover";
import { Badge } from "@food/components/ui/badge";
import { Avatar, AvatarFallback } from "@food/components/ui/avatar";
import foodIcon from "@food/assets/category-icons/food.png";
import quickIcon from "@food/assets/category-icons/quick.png";
import taxiIcon from "@food/assets/category-icons/taxi.png";
import hotelIcon from "@food/assets/category-icons/hotel.png";
import useNotificationInbox from "@food/hooks/useNotificationInbox";

const ICON_MAP = {
  CheckCircle2,
  Tag,
  Gift,
  AlertCircle
};



export default function HomeHeader({ 
  activeTab,
  setActiveTab,
  location, 
  savedAddressText, 
  handleLocationClick, 
  handleSearchFocus, 
  placeholderIndex, 
  placeholders,
  handleVegModeChange,
  isVegMode,
  vegModeToggleRef
}) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('food_user_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const {
    items: broadcastNotifications,
    unreadCount: broadcastUnreadCount,
    dismiss: dismissBroadcastNotification,
  } = useNotificationInbox("user", { limit: 20 });

  useEffect(() => {
    const syncNotifications = () => {
      const saved = localStorage.getItem('food_user_notifications');
      setNotifications(saved ? JSON.parse(saved) : []);
    };

    // Listen for updates from the main Notifications page
    window.addEventListener('notificationsUpdated', syncNotifications);
    // Also listen for new notifications being added via listeners in Notifications.jsx (indirectly via localStorage update)
    // But since localStorage doesn't fire events on same window, we can use a custom event or a simple interval if needed.
    // However, the Notifications.jsx already multi-dispatches.
    
    return () => window.removeEventListener('notificationsUpdated', syncNotifications);
  }, []);

  const festCategories = [
    { id: "food", name: "Food", icon: foodIcon, bgColor: "bg-white dark:bg-[#1a1a1a]" },
    { id: "quick", name: "Quick", icon: quickIcon, bgColor: "bg-white dark:bg-[#1a1a1a]" },
    { id: "taxi", name: "Taxi", icon: taxiIcon, bgColor: "bg-white dark:bg-[#1a1a1a]" },
    { id: "hotel", name: "Hotel", icon: hotelIcon, bgColor: "bg-white dark:bg-[#1a1a1a]" },
  ];

  const mergedNotifications = useMemo(() => {
    const localItems = Array.isArray(notifications)
      ? notifications.map((item) => ({ ...item, source: "local" }))
      : [];
    const broadcastItems = (broadcastNotifications || []).map((item) => ({
      ...item,
      source: "broadcast",
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "Just now",
      type: "broadcast",
      icon: "Bell",
      iconColor: "text-blue-600",
    }));

    return [...broadcastItems, ...localItems].sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() -
        new Date(a.createdAt || a.timestamp || 0).getTime()
    );
  }, [broadcastNotifications, notifications]);

  const unreadCount = notifications.filter(n => !n.read).length + broadcastUnreadCount;

  const handleDeleteNotification = (id, source = "local") => {
    if (source === "broadcast") {
      dismissBroadcastNotification(id);
      return;
    }
    setNotifications((prev) => {
      const next = prev.filter((notification) => notification.id !== id);
      localStorage.setItem('food_user_notifications', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { count: next.filter((n) => !n.read).length } }));
      return next;
    });
  };

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const slideBanners = [
    {
      id: 0,
      bg: "bg-[#FA0272]",
      content: (
        <div className="flex justify-between items-end h-full px-2 pb-2">
          <div className="flex flex-col items-start w-[65%] pb-2">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[26px] leading-[1] font-black text-white tracking-tight">Get</span>
              <div className="bg-white text-[#FA0272] px-2 py-0.5 rounded-r-lg font-bold text-[15px] relative ml-2 shadow-sm border-l-2 border-dashed border-[#FA0272]">
                <div className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[12px] border-y-transparent border-r-[8px] border-r-white"></div>
                50% OFF
              </div>
            </div>
            <div className="text-[26px] leading-[1.1] font-black text-white tracking-tight mb-2">& FREE delivery</div>
            <div className="text-[12px] font-bold text-pink-100 mb-3 opacity-90 leading-tight">on your first order under 7 km</div>
            <button className="bg-white text-[#FA0272] text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg transform active:scale-95 transition-transform pointer-events-auto">
              Know more <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="w-[35%] flex justify-end pb-0 pr-1">
            <img src={foodIcon} alt="offer" className="w-[100px] h-[100px] object-contain drop-shadow-2xl translate-x-2" />
          </div>
        </div>
      )
    },
    {
      id: 1,
      bg: "bg-gradient-to-br from-[#e0e8ff] to-[#bac9fd] dark:from-[#0f172a] dark:to-[#1e3a8a]",
      content: (
        <div className="flex justify-between items-end h-full px-2 pb-3">
          <div className="flex flex-col items-start w-[65%] pb-2">
            <div className="text-[28px] leading-[1.1] font-black text-[#1e3a8a] dark:text-[#93c5fd] tracking-tight mb-1">Flat ₹150 OFF</div>
            <div className="text-[12px] font-bold text-gray-800 dark:text-gray-300 mb-3 opacity-90">on Premium Dining restaurants</div>
            <button className="bg-[#1e3a8a] text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg transform active:scale-95 transition-transform pointer-events-auto">
              Explore now <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="w-[35%] flex justify-end pb-3 pr-2">
            <Sparkles className="w-[85px] h-[85px] text-blue-600/30 dark:text-blue-400/30 fill-blue-600/20 dark:fill-blue-400/20 drop-shadow-2xl" strokeWidth={1} />
          </div>
        </div>
      )
    },
    {
      id: 2,
      bg: "bg-gradient-to-br from-[#e9fcef] to-[#b3facf] dark:from-[#064e3b] dark:to-[#047857]",
      content: (
        <div className="flex justify-between items-end h-full px-3 pb-3">
          <div className="flex flex-col items-start w-[65%] pb-2">
            <div className="text-[28px] leading-[1.1] font-black text-[#065f46] dark:text-[#a7f3d0] tracking-tight mb-1">Free Delivery</div>
            <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200 mb-3 opacity-90">on all fast food orders above ₹199</div>
            <button className="bg-[#065f46] text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg transform active:scale-95 transition-transform pointer-events-auto">
              Order now <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
          <div className="w-[35%] flex justify-end pb-3 pr-1">
            <Gift className="w-[85px] h-[85px] text-green-700/30 dark:text-green-400/30 fill-green-700/20 dark:fill-green-400/20 drop-shadow-2xl" strokeWidth={1} />
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="relative h-[340px] w-full overflow-hidden rounded-b-[2rem] shadow-[0_10px_40px_rgba(250,2,114,0.15)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        
        {/* Sliding Background Track */}
        <div 
          className="absolute inset-0 flex transition-transform duration-700 ease-in-out z-0"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slideBanners.map((banner) => (
            <div key={banner.id} className={`relative w-full h-full shrink-0 ${banner.bg}`}>
              {/* Decorative Glows inside Slide 1 */}
              {banner.id === 0 && (
                <>
                  <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/30 blur-[60px] rounded-full pointer-events-none" />
                  <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-white/20 blur-[80px] rounded-full pointer-events-none" />
                </>
              )}
              
              {/* Banner Graphic - Positioned safely at the bottom below where the search bar will be */}
              <div className="absolute inset-x-0 bottom-6 h-[140px] px-2 flex flex-col justify-end">
                {banner.content}
              </div>
            </div>
          ))}
        </div>

        {/* Static Overlay Location Row */}
        <div className="absolute top-0 inset-x-0 z-20 px-4 pt-5 flex items-center justify-between gap-3">
          <div 
            className="flex items-center gap-1.5 cursor-pointer group min-w-0 flex-1"
            onClick={handleLocationClick}
          >
            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-md border border-white/20 hover:bg-white/30 transition-colors shadow-sm dark:bg-black/20 dark:border-white/10 dark:hover:bg-white/10 flex-shrink-0">
              <MapPin className="h-4 w-4 text-gray-900 dark:text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                <span className="text-[10px] font-bold text-gray-900/80 dark:text-white/80 uppercase tracking-wider">Deliver to</span>
                <ChevronDown className="h-2.5 w-2.5 text-gray-900/80 dark:text-white/80" />
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate drop-shadow-sm max-w-full">
                {savedAddressText || (location?.area && location?.city 
                  ? `${location.area}, ${location.city}` 
                  : location?.area || location?.city || "Select Location")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <div className="h-10 w-10 relative flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 shadow-sm cursor-pointer active:scale-95 transition-all hover:bg-white/30 dark:bg-black/20 dark:border-white/10 dark:hover:bg-white/10 flex-shrink-0">
                  <Bell className="h-[22px] w-[22px] text-gray-900 dark:text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-white animate-pulse dark:border-gray-900" />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl mt-2" align="end">
                <div className="bg-white dark:bg-gray-900">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none text-[10px] h-4">
                          {unreadCount} New
                        </Badge>
                      )}
                    </h3>
                    <Link to="/food/user/notifications" className="text-xs font-bold text-orange-600 hover:text-orange-700">
                      {mergedNotifications.length > 0 ? "View All" : ""}
                    </Link>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {mergedNotifications.length > 0 ? (
                      mergedNotifications.slice(0, 5).map((notif) => {
                        const Icon = ICON_MAP[notif.icon] || Bell;
                        return (
                          <div 
                            key={notif.id}
                            className={`p-4 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${!notif.read ? 'bg-orange-50/20' : ''}`}
                          >
                            <div className={`mt-1 p-2 rounded-full ${notif.type === "order" ? "bg-green-100/50 text-green-600" : "bg-orange-100/50 text-orange-600"}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{notif.title}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{notif.time}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteNotification(notif.id, notif.source);
                                    }}
                                    className="rounded-full p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <BellOff className="h-10 w-10 text-gray-200" />
                        <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50 text-center">
                    <Link to="/food/user/notifications" className="text-xs font-bold text-gray-400 hover:text-gray-600">
                      {mergedNotifications.length > 0 ? "Manage Settings" : "Check Notifications Page"}
                    </Link>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
 
            {/* Veg Mode Toggle */}
            <div 
              className="flex items-center gap-1.5 h-10 bg-white/20 dark:bg-black/20 backdrop-blur-md rounded-full px-2.5 border border-white/30 shadow-sm cursor-pointer hover:bg-white/30 dark:border-white/10 dark:hover:bg-white/10 active:scale-95 transition-all flex-shrink-0"
              onClick={() => handleVegModeChange && handleVegModeChange(!isVegMode)}
              ref={vegModeToggleRef}
            >
              <div className={`flex items-center justify-center p-[2px] rounded-sm border ${isVegMode ? 'border-green-600' : 'border-gray-500'} bg-white flex-shrink-0`}>
                <div className={`w-[6px] h-[6px] rounded-full ${isVegMode ? 'bg-green-600' : 'bg-gray-500'}`} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tight ${isVegMode ? 'text-green-800 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'} hidden xs:inline`}>
                Veg
              </span>
              <div className={`w-6 h-3.5 rounded-full relative transition-colors ml-0.5 flex-shrink-0 ${isVegMode ? 'bg-green-500' : 'bg-gray-400/80 dark:bg-gray-600'}`}>
                <div className={`absolute top-[1.5px] w-2.5 h-2.5 rounded-full bg-white transition-transform ${isVegMode ? 'translate-x-[11px]' : 'translate-x-[1.5px]'}`} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Carousel Pager Dots */}
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 z-20">
          {slideBanners.map((_, i) => (
            <span 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-black/60 w-3 dark:bg-white/80' : 'bg-black/20 w-1.5 dark:bg-white/30'}`} 
            />
          ))}
        </div>
      </div>

      {/* Sticky Search Bar - Pulled exactly below Location Bar but rendered on top of sliding banner */}
      <div className="relative sticky top-2 z-[60] px-3 pb-0 -mt-[256px] mb-[210px] pointer-events-none">
        <div 
          className="relative z-[60] rounded-[1.5rem] flex items-center px-4 py-3.5 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl border border-white dark:border-gray-800 shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] cursor-pointer active:scale-[0.98] transition-all duration-300 hover:shadow-[0_16px_48px_rgba(250,2,114,0.15)] group mx-1 pointer-events-auto"
          onClick={handleSearchFocus}
          onTouchStart={handleSearchFocus}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleSearchFocus();
            }
          }}
        >
          <Search className="h-5 w-5 text-gray-400 mr-3 group-hover:text-[#FA0272] transition-colors duration-300 dark:text-gray-500" strokeWidth={2.5} />
          <div className="flex-1 overflow-hidden relative h-5">
            <input
              type="text"
              readOnly
              aria-label="Search"
              onFocus={handleSearchFocus}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <AnimatePresence mode="wait">
              <motion.span
                key={placeholderIndex}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="absolute inset-0 text-[14px] font-bold text-gray-500 dark:text-gray-400"
              >
                {placeholders?.[placeholderIndex] || 'Search "pizza"'}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="bg-[#FA0272]/5 dark:bg-[#FA0272]/10 p-2 rounded-full border border-[#FA0272]/10 ml-2 group-hover:bg-[#FA0272]/10 transition-all flex items-center justify-center">
            <Mic className="h-4 w-4 text-[#FA0272]" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </>
  );
}
