# Eye Controls and Character Customization

## Developer menu: EYES

Press **9** to open the developer menu, then select **EYES**. **RESET EYE DEFAULTS** restores the original eye effect values (glow, blink, idle movement, reactions, and distance culling) without changing the selected robot or chicken appearance. The page refreshes its controls immediately after reset.

The EYES tab applies to eyes registered on the player, menu model, lobby bots, and fight models. When a robot chassis/head or chicken model is rebuilt, eye meshes are rescanned so effects attach to the newly selected head geometry. Head skin modules can mark dedicated `eye`, `eyes`, `lens`, `visor`, `optic`, or `optics` materials for eye effects; decorative lighting materials remain untouched.

## Character customization

The in-world customization panel stays on the current screen. **PET** selects a coop chicken and previews it on the display platform in place of the robot. Its body, head, wings, legs, and tail controls update the selected chicken immediately and are saved with the coop. **BODY** edits the trainer robot and its mixed base parts / skin modules. **FINISH** edits the current subject’s palette, including the chicken roughness control.

The preview restores the robot when leaving PET mode. Save commits the active customization; Cancel restores the previous appearance.
