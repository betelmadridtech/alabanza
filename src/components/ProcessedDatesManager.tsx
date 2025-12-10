"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProcessedDate {
	fecha: string;
	created_at?: string;
}

interface Props {
	onUpdate: () => void;
}

export function ProcessedDatesManager({ onUpdate }: Props) {
	const [open, setOpen] = useState(false);
	const [dates, setDates] = useState<ProcessedDate[]>([]);
	const [loading, setLoading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const fetchDates = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from("processed_dates")
			.select("*")
			.order("fecha", { ascending: false });

		if (!error && data) {
			setDates(data);
		}
		setLoading(false);
	};

	useEffect(() => {
		if (open) {
			fetchDates();
		}
	}, [open]);

	const handleDelete = async (fechaStr: string) => {
		const confirmMsg = `⚠️ BORRADO DE HISTORIAL ⚠️\n\nAl eliminar el ${fechaStr}:\n\n1. Trabajadores: Recuperan +5%.\n2. Descanso: Se les resta -5% (EXCEPTO si ya tienen 100%, que se quedan igual).\n3. Se borra la organización.\n\n¿Proceder?`;

		if (!window.confirm(confirmMsg)) return;

		setDeletingId(fechaStr);

		try {
			// 1. OBTENER QUIÉN TRABAJÓ
			const { data: assignmentsToDelete, error: fetchError } = await supabase
				.from('assignments')
				.select('user_id')
				.eq('fecha', fechaStr);

			if (fetchError) throw fetchError;

			const workersIds = new Set(assignmentsToDelete?.map(a => a.user_id) || []);

			// 2. OBTENER TODOS LOS USUARIOS
			const { data: allUsers, error: usersError } = await supabase
				.from('users')
				.select('id, disponibilidad');

			if (usersError) throw usersError;

			// 3. APLICAR LÓGICA DE RESTAURACIÓN (CON PROTECCIÓN 100%)
			const updates = allUsers.map(user => {
				let d = Number(user.disponibilidad ?? 100);

				if (workersIds.has(user.id)) {
					// CASO A: TRABAJÓ -> Recupera puntos (+5)
					d = d + 5;
				} else {
					// CASO B: DESCANSÓ
					// Si ya tiene 100 (o más), no le restamos nada para no castigarle injustamente
					if (d >= 100) {
						return null; 
					}else{
            d = d - 5;
          }				
				}

				// Límites de seguridad
				if (d > 100) d = 100;
				if (d < 0) d = 0;

				return supabase.from('users').update({ disponibilidad: d }).eq('id', user.id);
			});

			// Ejecutamos solo las actualizaciones necesarias (filtrando nulls)
			await Promise.all(updates.filter(p => p !== null));

			// 4. BORRAR DE PROCESSED_DATES
			const { error: deleteProcessedError } = await supabase
				.from("processed_dates")
				.delete()
				.eq("fecha", fechaStr);

			if (deleteProcessedError) throw deleteProcessedError;

			// 5. BORRAR DE ASSIGNMENTS
			const { error: deleteAssignmentsError } = await supabase
				.from('assignments')
				.delete()
				.eq("fecha", fechaStr);

			if (deleteAssignmentsError) throw deleteAssignmentsError;

			alert("Día eliminado correctamente.");
			await fetchDates();
			onUpdate();

		} catch (error: any) {
			console.error(error);
			alert("Error al eliminar: " + (error.message || error));
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" className="gap-2 text-slate-500 hover:text-slate-800">
					<CalendarClock size={18} />
					<span className="hidden sm:inline">Historial</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Fechas Procesadas</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-2">
						<AlertTriangle size={16} className="shrink-0 mt-0.5" />
						<p>
							<strong>Modo Restauración:</strong> Al borrar, los trabajadores recuperan puntos. Los que descansaron pierden puntos (salvo que ya tengan 100%).
						</p>
					</div>

					{loading ? (
						<div className="flex justify-center p-4">
							<Loader2 className="animate-spin text-slate-400" />
						</div>
					) : dates.length === 0 ? (
						<p className="text-center text-slate-400 py-4">No hay fechas procesadas aún.</p>
					) : (
						<div className="space-y-2">
							{dates.map((item) => {
								const dateObj = new Date(item.fecha + 'T00:00:00');
								return (
									<div
										key={item.fecha}
										className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-slate-300 transition-colors"
									>
										<div className="flex flex-col">
											<span className="font-medium text-slate-700 capitalize">
												{format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}
											</span>
											<span className="text-xs text-slate-400">
												{item.fecha}
											</span>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="text-red-400 hover:text-red-600 hover:bg-red-50"
											disabled={deletingId === item.fecha}
											onClick={() => handleDelete(item.fecha)}
											title="Borrar día"
										>
											{deletingId === item.fecha ? (
												<Loader2 size={18} className="animate-spin" />
											) : (
												<Trash2 size={18} />
											)}
										</Button>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}