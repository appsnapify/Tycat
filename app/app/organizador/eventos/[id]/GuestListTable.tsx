'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { getGuestsForEvent, GuestResult } from '@/app/lib/actions/guestActions' // Importar a Server Action e tipo
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface GuestListTableProps {
    eventId: string;
}

const PAGE_SIZE = 20; // Pode ser ajustado

export default function GuestListTable({ eventId }: GuestListTableProps) {
    const [guests, setGuests] = useState<GuestResult[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    // Filtro: null = todos, true = checked-in, false = not checked-in
    const [filterCheckedIn, setFilterCheckedIn] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition(); // Para debounce e loading states

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        setError(null);
        startTransition(async () => {
            try {
                const result = await getGuestsForEvent(
                    eventId,
                    currentPage,
                    PAGE_SIZE,
                    searchTerm || undefined, // Passa undefined se vazio
                    filterCheckedIn
                );

                if (result.error) {
                    throw new Error(result.error);
                }

                setGuests(result.guests);
                setTotalCount(result.totalCount);

            } catch (err: any) {
                console.error("Erro ao buscar convidados no cliente:", err);
                setError(err.message || "Falha ao carregar convidados.");
                toast({
                    title: "Erro",
                    description: err.message || "Falha ao carregar convidados.",
                    variant: "destructive",
                })
            }
            finally {
                setIsLoading(false);
            }
        });

    }, [eventId, currentPage, searchTerm, filterCheckedIn]);

    // Fetch inicial e quando dependências mudam
    useEffect(() => {
        fetchData();
    }, [fetchData]); // fetchData é memoizado pelo useCallback

    // Handler para mudança de pesquisa (com debounce implícito pelo useTransition)
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1); // Resetar para primeira página ao pesquisar
    };

    // Handler para mudança de filtro check-in
    const handleFilterChange = (checked: boolean | 'indeterminate') => {
        if (checked === 'indeterminate' || checked === false) {
             // Simplificando: checkbox não marcado = mostrar todos (null)
             // Se precisar de 3 estados (todos, sim, não), usar um Select ou RadioGroup
            setFilterCheckedIn(null); 
        } else {
            setFilterCheckedIn(true); // Marcado = mostrar apenas check-in = true
        }
         setCurrentPage(1); // Resetar para primeira página ao filtrar
    };

    // Handlers de Paginação
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const formatDateSimple = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        } catch { return 'Data inválida'; }
    };

    const formatTimeSimple = (dateString: string | null) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
        } catch { return 'Hora inválida'; }
    };

    return (
        <div className="space-y-4">
            {/* Filtros e Pesquisa (já responsivo com md:flex-row) */}
            <div className="flex flex-col md:flex-row gap-4">
                <Input
                    placeholder="Pesquisar por nome ou telefone..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="max-w-sm"
                />
                <div className="flex items-center space-x-2">
                     <Checkbox 
                        id="filter-checkedin"
                        checked={filterCheckedIn === true} // Só marca se for true
                        onCheckedChange={handleFilterChange}
                    />
                    <Label htmlFor="filter-checkedin">Mostrar apenas check-in</Label>
                </div>
            </div>

            {/* Tabela de Convidados (adicionar container com overflow) */}
            <div className="rounded-md border overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Promotor</TableHead>
                            {/* Ocultar em ecrãs < sm */}
                            <TableHead className="hidden sm:table-cell">Equipa</TableHead>
                            {/* Ocultar em ecrãs < sm */}
                            <TableHead className="hidden sm:table-cell">Registado em</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            // Loading Skeletons
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skel-${i}`}>
                                     {/* Ajustar colSpan conforme colunas visíveis */}
                                    <TableCell colSpan={3} className="sm:hidden"> <Skeleton className="h-6 w-full" /> </TableCell>
                                    <TableCell colSpan={5} className="hidden sm:table-cell"> <Skeleton className="h-6 w-full" /> </TableCell>
                                </TableRow>
                            ))
                        ) : error ? (
                            <TableRow>
                                 {/* Ajustar colSpan */}
                                <TableCell colSpan={5} className="text-center text-red-500">{error}</TableCell>
                            </TableRow>
                        ) : guests.length > 0 ? (
                            guests.map((guest) => (
                                <TableRow key={guest.id}>
                                    <TableCell className="font-medium">{guest.name || '-'}</TableCell>
                                    <TableCell>{guest.checked_in ? `Sim (${formatTimeSimple(guest.check_in_time)})` : 'Não'}</TableCell>
                                    <TableCell>{guest.promoter_name || '-'}</TableCell>
                                    {/* Ocultar em ecrãs < sm */}
                                    <TableCell className="hidden sm:table-cell">{guest.team_name || '-'}</TableCell>
                                    {/* Ocultar em ecrãs < sm */}
                                    <TableCell className="hidden sm:table-cell">{formatDateSimple(guest.created_at)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                 {/* Ajustar colSpan */}
                                <TableCell colSpan={5} className="text-center">Nenhum convidado encontrado.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Paginação (tornar responsiva) */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-4 py-4">
                     <div className="text-sm text-muted-foreground text-center sm:text-left">
                        Página {currentPage} de {totalPages} ({totalCount} convidados)
                    </div>
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPage}
                            disabled={currentPage <= 1 || isPending || isLoading}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={currentPage >= totalPages || isPending || isLoading}
                        >
                            Próxima
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
} 