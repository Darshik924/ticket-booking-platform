-- KEYS[1] is seat lock key
-- ARGV[1] userId (only the owner can release)

local key = KEYS[1]
local userId = ARGV[1]

local holder = redis.call("GET", key)

if (holder == userId) then
    redis.call("DEL", key)
    return 1 -- The seat lock was released by the same user Only (payment was processed) 
else 
    return 0 -- The current lock is not the user's lock
end
