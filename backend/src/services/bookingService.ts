import { BookingStatus, PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export const createBooking = async (userId: number, seatId: number) => {
  const seat = await prisma.seat.findUnique({
    where: {
      id: seatId,
    },
  });

  if (!seat) {
    throw new Error("Seat not found");
  }

  if (seat.status !== "AVAILABLE") {
    throw new Error("seat is not AVAILABLE");
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      seatId,
    },
  });

  await prisma.seat.update({
    where: {
      id: seatId,
    },
    data: {
      status: "BOOKED",
    },
  });

  return booking;
};

export const getMyBookings = async (
       userId : number
)=>{
    const bookings = await prisma.booking.findMany({//find many becz oneuser => many bookings
        where:{
            userId,
        },
        include:{
            seat:true,
        },
    });

    return bookings;

};


export const getBookingById = async(
    BookingId: number,
    userId:number 
)=>{
    const booking = await prisma.booking.findUnique({
        where:{
            id:BookingId,
        },
        include:{
            seat:true,
        },
    });

    if(!booking){
        throw new Error("Booking not found");
    }

    if(booking.userId!== userId){
        throw new Error("Unauthorized");
    }

    return booking;
}

export const cancelBooking = async(
    bookingId:number, 
    userId: number
)=>{
    const booking = await prisma.booking.findUnique({
        where:{
            id:bookingId,
        },
    });
    
    if(!booking){
        throw new Error("Booking not found");
    }

    if(booking.userId !== userId){
      throw new Error("Unathorised");
    }

    const updateBooking = 
       await prisma.booking.update({
        where:{
            id:bookingId,
        },
        data:{
            status :"CANCELLED",
        },
       });
       await prisma.seat.update({
        where:{
            id:bookingId,
        },
        data:{
            status:"AVAILABLE",
        }
       });

       return updateBooking;
}

