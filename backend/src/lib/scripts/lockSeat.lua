-- KEYS[1] = seat lock key (e.g., seat_lock:eventId:seatId)
-- ARGV[1] = userId
-- ARGV[2] = TTL in seconds

local key = KEYS[1]
local userId = ARGV[1]
local ttl = tonumber(ARGV[2])

-- SET key userId EX ttl NX (set only if not exists)
-- We will now call redis method and basically run this script in the redis server

local result = redis.call("SET", key, userId, "EX", ttl, "NX")

if result then 
    return 1 -- Seat Existed and the lock was acquired
else 
    -- Now we will check who holds the lock
    local holder = redis.call("GET", key)
    if (holder == userId) then 
        -- The same user is relocking their own seat, Refresh our TTL
        redis.call("EXPIRE", key, ttl)
        return 1
    end
    return 0
    -- Else case (This was locked by someone else)
end

