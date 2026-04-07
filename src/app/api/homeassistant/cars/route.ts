import { getState } from "@/lib/ha";

export async function GET() {
  try {
    const [
      eSoc, eTarget, eRange, ePlug, eCharge,
      pSoc, pTarget, pRange, pPlug, pCharge,
    ] = await Promise.all([
      getState("sensor.enyaq_state_of_charge_2"),
      getState("sensor.enyaq_target_state_of_charge_2"),
      getState("sensor.enyaq_estimated_remaining_driving_range_2"),
      getState("binary_sensor.enyaq_kontakt"),
      getState("binary_sensor.enyaq_laddning"),
      getState("sensor.2023_polestar_2_space_state_of_charge"),
      getState("sensor.2023_polestar_2_space_target_state_of_charge"),
      getState("sensor.2023_polestar_2_space_estimated_remaining_driving_range"),
      getState("binary_sensor.2023_polestar_2_space_kontakt"),
      getState("binary_sensor.2023_polestar_2_space_laddning"),
    ]);

    return Response.json({
      cars: [
        {
          id:          "enyaq",
          name:        "Skoda Enyaq",
          soc:         parseInt(eSoc.state)    || 0,
          target_soc:  parseInt(eTarget.state) || 80,
          range_km:    Math.round((parseInt(eRange.state) || 0) / 1000),
          plugged_in:  ePlug.state   === "on",
          charging:    eCharge.state === "on",
        },
        {
          id:          "polestar",
          name:        "Polestar 2",
          soc:         parseInt(pSoc.state)    || 0,
          target_soc:  parseInt(pTarget.state) || 80,
          range_km:    Math.round((parseInt(pRange.state) || 0) / 1000),
          plugged_in:  pPlug.state   === "on",
          charging:    pCharge.state === "on",
        },
      ],
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
