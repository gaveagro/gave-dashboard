import React, { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  user_id: string;
  name?: string;
  email: string;
}

interface UserSelectorProps {
  users: User[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function UserSelector({ users, value, onChange, placeholder = "Seleccionar usuario" }: UserSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedUser = users.find(user => user.user_id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedUser
            ? (selectedUser.name || selectedUser.email)
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar usuario..." />
          <CommandEmpty>No se encontró ningún usuario.</CommandEmpty>
          <CommandGroup>
            <CommandList>
              {users
                .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
                .map((user) => (
                <CommandItem
                  key={user.user_id}
                  value={`${user.name || ''} ${user.email}`}
                  onSelect={() => {
                    onChange(user.user_id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.user_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name || user.email}</span>
                    {user.name && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}