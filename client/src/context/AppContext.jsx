import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { data, useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration"
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify';
export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const currency = import.meta.env.VITE_CURRENCY || '$';
    const navigate = useNavigate();

    const { getToken } = useAuth();
    const { user } = useUser()

    const [allCourses, setAllCourses] = useState([])
    const [isEducator, setIsEducator] = useState(false)
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [userData, setUserData] = useState(null)

    // fetch all courses 
    const fetchAllCourses = async () => {
        // setAllCourses(dummyCourses)
        try {
            const { data } = await axios.get(backendUrl + '/api/course/all');
            if (data.success) {
                setAllCourses(data.courses)
            } else {
                toast.error(data.message);
            }

        } catch (error) {
            toast.error(error.message)
        }
    }

    // fetch user data
    const fetchUserData = async () => {

        if (user && user.publicMetadata && user.publicMetadata.role === 'educator') {
            setIsEducator(true);
        }

        try {
            const token = await getToken();

            const { data } = await axios.get(backendUrl + '/api/user/data', { headers: { Authorization: `Bearer ${token}` } })

            if (data.success) {
                setUserData(data.user)
            } else {
                // If user not found, don't show error toast, just keep userData as null
                if (data.message !== "User not found!") {
                    toast.error(data.message)
                }
            }

        } catch (error) {
            // Don't show toast error for user not found
            if (error.response?.data?.message !== "User not found!") {
                toast.error(error.message)
            }
        }
    }

    // Function to calculate average rating of course
    const calculateRating = (course) => {
        if (!course.courseRatings || course.courseRatings.length === 0) {
            return 0;
        }
        let totalRating = 0;
        course.courseRatings.forEach(rating => {
            totalRating += rating.rating;
        })
        return Math.floor(totalRating / course.courseRatings.length)
    }

    // function to calculate course chapter time
    const calculateChapterTime = (chapter) => {
        if (!chapter.chapterContent || !Array.isArray(chapter.chapterContent)) {
            return "0m";
        }
        let time = 0;
        chapter.chapterContent.map((lecture) => time += lecture.lectureDuration || 0)
        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] })
    }

    // Function to calculate course Duratuion
    const calculateCourseDuration = (course) => {
        if (!course.courseContent || !Array.isArray(course.courseContent)) {
            return "0m";
        }
        let time = 0;
        course.courseContent.map((chapter) => {
            if (chapter.chapterContent && Array.isArray(chapter.chapterContent)) {
                chapter.chapterContent.map((lecture) => time += lecture.lectureDuration || 0)
            }
        })

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] })
    }

    // Function to calculate to no. of lectures in the course
    const calculateNoOfLectures = (course) => {
        if (!course.courseContent || !Array.isArray(course.courseContent)) {
            return 0;
        }
        let totalLectures = 0;
        course.courseContent.forEach(chapter => {
            if (Array.isArray(chapter.chapterContent)) {
                totalLectures += chapter.chapterContent.length;
            }
        });
        return totalLectures;
    }

    // Fetch user enrolled courses

    // const fetchUserEnrolledCourses = async()=>{
    //     // setEnrolledCourses(dummyCourses)
    //    try {
    //     const token = await getToken();

    //     const data = await axios.get(backendUrl + '/api/user/enrolled-courses', {headers: {Authorization: `Bearer ${token}`}})

    //     console.log("Data",data);
    //     if(data){
    //         setEnrolledCourses(data.enrolledCourses.reverse());
    //         // console.log("enroll", enrolledCourses);
    //         // console.log("setenroll", enrolledCourses);

    //     }else{
    //         toast.error(data.message)
    //     }
    //    } catch (error) {
    //     toast.error(error.message)
    //    }
    // }


    const fetchUserEnrolledCourses = async () => {
        try {
            const token = await getToken();
            const response = await axios.get(backendUrl + "/api/user/enrolled-courses", {
                headers: { Authorization: `Bearer ${token}` }
            });

            // console.log("Response:", response); // Debugging: Log full response

            if (response.data && response.data.success) {
                setEnrolledCourses(response.data.enrolledCourses.reverse());
            } else {
                // If user not found, just set empty array instead of showing error
                if (response.data?.message === "User not found!") {
                    setEnrolledCourses([]);
                } else {
                    toast.error(response.data?.message || "No enrolled courses found.");
                }
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            // Don't show toast error for user not found, just set empty array
            if (error.response?.data?.message === "User not found!") {
                setEnrolledCourses([]);
            } else {
                toast.error(error.response?.data?.message || error.message);
            }
        }
    };

    useEffect(() => {
        fetchAllCourses()
    }, [])

    useEffect(() => {

    }, [])


    // const logToken = async ()=>{
    //     console.log(await getToken());

    // }

    useEffect(() => {
        if (user) {
            fetchUserData()
            // logToken()
            fetchUserEnrolledCourses()
        }
    }, [user])

    const value = {
        currency, allCourses, navigate, isEducator, setIsEducator,
        calculateRating, calculateChapterTime, calculateCourseDuration, calculateNoOfLectures
        , fetchUserEnrolledCourses, setEnrolledCourses, enrolledCourses, backendUrl, userData, setUserData, getToken, fetchAllCourses

    }


    return (
        <AppContext.Provider value={value} >
            {props.children}
        </AppContext.Provider>
    )



}