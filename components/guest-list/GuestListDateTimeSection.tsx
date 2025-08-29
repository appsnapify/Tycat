'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface GuestListDateTimeSectionProps {
  form: any
}

export function GuestListDateTimeSection({ form }: GuestListDateTimeSectionProps) {
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <h3 className="text-lg font-medium border-b pb-2">Período da Guest List *</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        {/* Guest List Open Date */}
        <FormField
          control={form.control}
          name="guestListOpenDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Abertura Data</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {field.value ? (
                        format(field.value, 'dd/MM/yyyy')
                      ) : (
                        <span>Escolha data</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Guest List Open Time */}
        <FormField
          control={form.control}
          name="guestListOpenTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abertura Hora</FormLabel>
              <FormControl>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="time" step="600" className="pl-10" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Guest List Close Date */}
        <FormField
          control={form.control}
          name="guestListCloseDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecho Data</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                      {field.value ? (
                        format(field.value, 'dd/MM/yyyy')
                      ) : (
                        <span>Escolha data</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => 
                      date < (form.getValues("guestListOpenDate") || new Date(new Date().setHours(0,0,0,0)))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Guest List Close Time */}
        <FormField
          control={form.control}
          name="guestListCloseTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecho Hora</FormLabel>
              <FormControl>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="time" step="600" className="pl-10" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormDescription>
        Define quando os convidados podem entrar na lista. A lista fecha automaticamente.
      </FormDescription>
    </div>
  )
}
