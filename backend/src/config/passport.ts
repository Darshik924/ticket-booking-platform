import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { googleLogin } from "../services/auth.service.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const data = await googleLogin(
            profile.id, 
            profile.emails?.[0].value || "",
            profile.displayName,
            profile.photos?.[0].value
        );

        return done(null, data);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;