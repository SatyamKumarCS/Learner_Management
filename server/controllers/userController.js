import Stripe from "stripe"
import Course from "../models/Course.js"
import { Purchase } from "../models/Purchase.js"
import User from "../models/User.js"
import { CourseProgress } from "../models/CourseProgress.js"
import { clerkClient } from "@clerk/express"

// Get users data
export const getUserData = async (req, res) => {
    try {
        const userId = req.auth.userId;
        let user = await User.findById(userId);
        
        if (!user) {
            // If user doesn't exist, create one using Clerk data
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const userData = {
                    _id: clerkUser.id,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
                    imageUrl: clerkUser.imageUrl || '',
                    enrolledCourses: []
                };
                user = await User.create(userData);
            } catch (clerkError) {
                return res.json({ success: false, message: "User not found and could not be created!" });
            }
        }

        return res.json({ success: true, user });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// User enrolled course with lecture link
export const userEnrolledCourses = async (req, res) => {
    try {
        const userId = req.auth.userId;
        let userData = await User.findById(userId).populate('enrolledCourses');

        if (!userData) {
            // If user doesn't exist, create one using Clerk data
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const newUserData = {
                    _id: clerkUser.id,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
                    imageUrl: clerkUser.imageUrl || '',
                    enrolledCourses: []
                };
                userData = await User.create(newUserData);
                // For newly created user, enrolledCourses will be empty array
            } catch (clerkError) {
                return res.json({ success: false, message: "User not found and could not be created!" });
            }
        }

        return res.json({ success: true, enrolledCourses: userData.enrolledCourses || [] });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Purchase course
export const purchaseCourse = async (req, res) => {
    try {
        const { courseId } = req.body;
        const { origin } = req.headers;
        const userId = req.auth.userId;

        let userData = await User.findById(userId);
        const courseData = await Course.findById(courseId);

        if (!userData) {
            // If user doesn't exist, create one using Clerk data
            try {
                const clerkUser = await clerkClient.users.getUser(userId);
                const newUserData = {
                    _id: clerkUser.id,
                    email: clerkUser.emailAddresses[0].emailAddress,
                    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
                    imageUrl: clerkUser.imageUrl || '',
                    enrolledCourses: []
                };
                userData = await User.create(newUserData);
            } catch (clerkError) {
                return res.json({ success: false, message: "User not found and could not be created!" });
            }
        }

        if (!courseData) {
            return res.json({ success: false, message: "Course Not Found" });
        }

        const amount = (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2);

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount,
        };

        const newPurchase = await Purchase.create(purchaseData);

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        const currency = (process.env.CURRENCY || 'usd').toLowerCase();

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount * 100)
            },
            quantity: 1
        }];

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        });

        return res.json({ success: true, session_url: session.url });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Update user Course progress
export const updateUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { courseId, lectureId } = req.body;
        const progressData = await CourseProgress.findOne({ userId, courseId });

        if (progressData) {
            if (progressData.lectureCompleted.includes(lectureId)) {
                return res.json({ success: true, message: "Lecture Already Completed" });
            }

            progressData.lectureCompleted.push(lectureId);
            progressData.completed = true;
            await progressData.save();
        } else {
            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [lectureId]
            });
        }

        return res.json({ success: true, message: 'Progress Updated' });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Get user course progress
export const getUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { courseId } = req.body;
        const progressData = await CourseProgress.findOne({ userId, courseId });

        return res.json({ success: true, progressData });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// Add user ratings to course
export const addUserRating = async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { courseId, rating } = req.body;

        if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
            return res.json({ success: false, message: "Invalid details" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.json({ success: false, message: "Course Not found!" });
        }

        const user = await User.findById(userId);
        if (!user || !user.enrolledCourses.includes(courseId)) {
            return res.json({ success: false, message: "User has not purchased this course." });
        }

        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId);
        if (existingRatingIndex > -1) {
            course.courseRatings[existingRatingIndex].rating = rating;
        } else {
            course.courseRatings.push({ userId, rating });
        }

        await course.save();

        return res.json({ success: true, message: "Rating Added" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};
