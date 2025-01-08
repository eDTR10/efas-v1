import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "@/components/ui/alert"

const AlertBox = ({variant,title,description}:any) => {


  switch (variant) {
    case "success":
        return (
            <Alert variant="default" className=" border-green-500 ">
                    <AlertTitle className="  text-green-500 ">{title}</AlertTitle>
                    <AlertDescription className=" text-green-500 sm:text-xs ">
                    {description}
                    </AlertDescription>
            </Alert>
          )
      
    case "error":
        return (
            <Alert variant="default" className=" border-red-500 ">
                    <AlertTitle className=" text-red-500">{title}</AlertTitle>
                    <AlertDescription className=" text-red-500 sm:text-xs">
                    {description}
                    </AlertDescription>
            </Alert>
            )
    default:
    return (
        <></>
        )
  }      
  
}

export default AlertBox