import jwt  from "jsonwebtoken";

export const generateToken = (
    userId:number , 
    email: string 
)=>{
    return jwt.sign(
        {
            userId,
            email,
        },
        process.env.JWT_SECRET as string,
        {
            expiresIn:"7D",
        }
    );
};