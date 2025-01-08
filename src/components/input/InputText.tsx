import { Input } from '../ui/input'

function InputText({type,label,onChange,value}:any) {
  return (
    <div className=' w-full grid grid-cols-5 sm:flex sm:flex-col items-center sm:items-start  gap-4 sm:gap-2'>
        <p className=' col-span-1 text-foreground font-gmedium text-sm '>{label}</p>
       <Input className=' col-span-4 text-foreground outline-none font-gmedium' value={value} type={type} onChange={onChange} placeholder={label} />
    </div>
  )
}

export default InputText